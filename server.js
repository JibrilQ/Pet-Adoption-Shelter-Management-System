// load env variables
require('dotenv').config(); 

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db'); // import db connection

//multer config 
const multer =require('multer');

const storage = multer.diskStorage({
    destination: (req,file, cb) => {
        //saves images to 'static/images' folder
        cb(null, 'static/images');
    },
    filename: (req, file, cb) => {
        //renames file to prevent duplicates
        cb(null,Date.now() + '-' + file.originalname);
    }
});

const upload = multer({storage: storage});

const app = express();
const PORT = process.env.PORT || 3000;

//config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// server static files (css, images)
app.use(express.static(path.join(__dirname, 'static')));

// Parse incoming form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// global middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

//public routing

// homepage --> shows 3 featured pets only
app.get('/', async (req, res) => {
    try {
        const [featuredPets] = await db.query(`
            SELECT pets.*, users.username AS shelter_name 
            FROM pets 
            JOIN users ON pets.shelter_id = users.id 
            WHERE pets.status = 'active'
            ORDER BY pets.date_listed DESC
            LIMIT 3
        `);
        res.render('index', { pets: featuredPets });
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});

// Static pages
app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));

/*LOGIN ROUTING */

app.get('/login', (req, res) => {
    res.render('login', {error: req.query.error});
});

app.post('/login', async (req, res) => {
    const {email, password, role} = req.body;

    try{
        const[users] = await db.query(
            'SELECT * FROM users WHERE  email = ? AND role = ?',
            [email, role]
        );
        
        //password validation
        //success logic
        if (users.length > 0 && users[0].password === password) {
            //log in success
            req.session.user = users[0];

            //route between adopter and shelter
            //takes shelter login to pet management page
            if (role === 'shelter'){
                res.redirect('/shelter/pets');
            }
            
            else {
                res.redirect('/');
                }
        } //end of success code

        else{
            //login failure logic
            res.redirect('/login?error=invalid');
        }


    } //end of try code block

    catch(err) {
        console.log(err);
        res.status(500).send("Error during login");
        } //end of catch block

});

app.get('/logout', (req, res) => {
    //kills session
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        //redirects to publics homepage
        res.redirect('/');
    });

});

app.get('/register', (req, res) => {
    //Looks for errors passed by query
    res.render('register', {error: req.query.error});
});

app.post('/register', async(req,res) => {
    //gets all fields
    const {name, email, password, password_confirm, role, phone, city} = req.body;

    // Paassword validation
    if (password !== password_confirm) {
        //redirect
        return res.redirect('/register?error=password_mismatch');
    }

    try {
        //check for email duplicate
        const[existing] = await db.query('SELECT id FROM users WHERE email = ?',[email]);

        if (existing.length > 0 ) {
            return res.redirect('/register?error=email_exists')
        }
    

    //insert new user upon success
    await db.query(
        'INSERT INTO users (name, email, password, role, username, phone, city) VALUES (?,?,?,?,?,?,?)',
        [name, email, password, role, email.split('@')[0], phone, city]
    );

    //success --> send user to login page
    res.redirect('/login');
 }
    //catch block
    catch(err) {
        console.error(err);
        res.redirect('/register?error=server_error')
        }

});

//renders all_pets.ejs with all active pets
app.get('/pets', async (req, res) => {
    try {
        // sql brings all active pets as well as sharing shelter name

        const[allPets] = await db.query(`
            SELECT pets.*, users.username AS shelter_name
            FROM pets
            JOIN users ON pets.shelter_id = users.id
            WHERE pets.status = 'active'
            ORDER BY pets.date_listed DESC
        `);

        res.render('all_pets', {pets : allPets});
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error whilst fetching pets")
    }
});

app.get('/pets/:id', async (req, res) => {
    try {
        const petID = req.params.id;
        const userId = req.session.user ? req.session.user.id : null;

        const[results] = await db.query(`
            SELECT pets.*, users.username as shelter_name, users.email as shelter_email, users.phone as shelter_phone
            FROM pets
            JOIN users on pets.shelter_id = users.id
            WHERE pets.id = ?
        `, [petID]);

        if (results.length === 0) return res.status(404).send('ERROR! PET NOT FOUND');

        let applicationStatus = null;

        if (userId && req.session.user.role === 'adopter'){
            const[app] = await db.query(
                `SELECT status from applications WHERE pet_id = ? AND adopter_id = ?`, [petID, userId]
            );
            if (app.length > 0) applicationStatus = app[0].status;
        }

        res.render('pet_details', {
            pet: results[0],
            applicationStatus : applicationStatus
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("ERROR! DATABASE ERROR!");
    }

});

//get application
app.get('/pets/:id/apply', async (req,res) => {
    //must be an adopter
    if (!req.session.user || req.session.user.role !== 'adopter') {
        return res.redirect('/login');
    }

    try {
        const petId = req.params.id;
        //fetch pet pet_details
        const[results] = await db.query(`
            SELECT pets.*, users.username as shelter_name
            FROM pets
            JOIN users ON pets.shelter_id = users.id
            WHERE pets.id = ?
        `, [petId]);

        if (results.length === 0) return res.status(404).send("Pets not found"); //error 

        //render application view
        res.render('adopter/apply', {pet: results[0]});
    }

    catch (err) {
        console.error(err);
        res.status(500).send("ERROR! DATABSE ERROR!");
    }

});

//process applications 
app.post('/pets/:id/apply', async(req,res) => {
    //security check
    if (!req.session.user || req.session.user.role !== 'adopter') {
        return res.redirect('/login');
    }

    const petId = req.params.id;
    const adopterId = req.session.user.id;
    const home_setup = req.body.home_setup;
    const prior_pets = req.body.prior_pets;

    try {
        //insert applications into Database
        await db.query(`
            INSERT INTO applications (pet_id, adopter_id, home_setup, prior_pets, status) VALUES (?,?,?,?,?)`,[petId, adopterId, home_setup, prior_pets,'submitted']
        );

        //Upon success, redirect to application dasboard  [not made yet]
        res.redirect('/adopter/applications?submitted=true');

    }

    catch (err) {
        //error handling --> upon duplicate entries
        if (err.code === 'ER_DUP_ENTRY'){
            return res.send("You have already applied for this pet");
        }

        console.error(err);
        res.status(500).send("ERROR! ERROR UPON SUBMISSION! PLEASE TRY AGAIN")
    }
});

//fetches applications from adopters for the logged in adopter
app.get('/adopter/applications', async (req,res) => {
    //security check --> must be a logged in adopter
    if (!req.session.user || req.session.user.role !== 'adopter'){
        return res.redirect('/login');
    }

    try {
        const adopterId = req.session.user.id;
        //get application information (i.e status, date)
        //Join pets and users (to get pet name and shelter name)
        const [myApps] = await db.query(`
            SELECT
                applications.status,
                applications.created_at as date_applied,
                pets.id as pet_id,
                pets.name as pet_name,
                users.name as shelter_name
            
            FROM applications
            JOIN pets ON applications.pet_id = pets.id
            JOIN users ON pets.shelter_id = users.id
            WHERE applications.adopter_id = ?
            ORDER BY applications.created_at DESC`, [adopterId]);
        
        //render view and pass the data
        res.render('adopter/applications',{
            applications: myApps,
            submitted: req.query.submitted // passes the success flag if redirected here
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Error whilst fetching application details");
    }

});

// getting adopter profile information
app.get('/adopter/profile', (req,res) => {
    //security check --> must be logged in as an adopter
    if (!req.session.user || req.session.user.role !== 'adopter'){
        return res.redirect('/login');
    }

    //renders the view
    res.render('adopter/profile')

});

//checks user is loggin in as a shelter
const ShelterChecker = (req,res,next) => {
    if (!req.session.user || req.session.user.role !== 'shelter') {
        return res.redirect('/login');
    }
    next();
};

//list pets for logged in shelter
app.get('/shelter/pets', ShelterChecker, async  (req,res) => {
    try{
        //gets pets from only logged in shelter
        const [myPets] = await db.query(
            `SELECT * FROM pets where shelter_id = ? ORDER BY date_listed DESC`, [req.session.user.id]
        );

        //renders created viewr
        res.render('shelter/my_pets', {
            pets: myPets,
            message: req.query.message //e.g. Success --> "STATUS UPDATED!"
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).send("ERROR! DATABASE ERROR!");
    }

});

//toggles pet status
app.post('/shelter/pets/:id/toggle', ShelterChecker, async (req,res)=> {
    try {
        const petId = req.params.id;
        const shelterId = req.session.user.id;
        //verify shelter owns pet
        const[pet] = await db.query(
            `SELECT status FROM pets where id = ? AND shelter_id = ?`, [petId, shelterId]
        );

        if (pet.length === 0) {
            return res.status(404).send("ERROR! Pet not found or access has been denied")
        }

        //calculates new pet status
        const currentStatus = pet[0].status;
        const newStatus = currentStatus  === 'active' ? 'adopted' : 'active';

        //update Database
        await db.query(`UPDATE pets SET status = ? WHERE id = ?`, [newStatus, petId]);

        //redirect back to shelter homepage alongside a success message
        res.redirect('/shelter/pets?message=Status%20Updated%20to%20:%20' + newStatus); //properly spaced


    }

    catch (err) {
        console.error(err);
        res.status(500).send("SERVER ERROR! UPDATE FAILED DUE TO SERVER ERROR!");
    }

});

//show "list a pet" ui 
app.get('/shelter/pet/new', ShelterChecker, (req, res) => {
    //renders view
    res.render('shelter/add_pet', {error: null});
});

//process newly listed pet
app.post('/shelter/pet/new', ShelterChecker, upload.single('photo'), async (req,res) => {
    try{
        //gets text data from shelter form
        const {name, species, breed, age, size, temperament, description} = req.body;
        const shelterId = req.session.user.id;

        //handling image pathing
        let photoPath = '/images/no_photo.jpg' //fallback
        if (req.file) {
            //given a file upload, use file upload name
            photoPath = '/images/' + req.file.filename;
        }

        //insert into Database
        await db.query(`INSERT INTO pets (shelter_id, name, species, breed, age, size, temperament, description, photo, status, date_listed) VALUES (?,?,?,?,?,?,?,?,?, 'active', CURDATE())`, [shelterId,name, species, breed, age, size, temperament, description, photoPath]);

        //redirect back to shelterhomepage with success message
        res.redirect('/shelter/pets?message=SUCCESS!');


    }

    catch (err) {
        console.error(err);
        res.render('shelter/add_pet', {error: "ERROR! ERROR LISTING PET! Please try again later."});
    }

});

//view incoming applications
app.get('/shelter/applications', ShelterChecker, async (req, res) => {
    try {
        const shelterId = req.session.user.id;
        //takes information from 3 tables (applications, pets, and adopter)
        const[apps] = await db.query(`
        SELECT
            applications.id,
            applications.status,
            applications.home_setup,
            applications.prior_pets,
            pets.name AS pet_name,
            pets.species AS pet_species,
            users.name AS adopter_name,
            users.email AS adopter_email
        FROM applications
        JOIN pets ON applications.pet_id = pets.id
        JOIN users ON applications.adopter_id = users.id
        WHERE pets.shelter_id = ?
        ORDER BY applications.created_at DESC`, [shelterId]);

        res.render('shelter/applications', {applications: apps});
    }

    catch (err) {
        console.error(err);
        res.status(500).send("ERROR! DATABASE ERROR UPON FETCHING APPLICATION INFORMATION!");
    }


});

//handles approval and declining
app.post('/application/:id/update', ShelterChecker, async (req, res) => {
    try {
        const appId = req.params.id;
        const newStatus = req.body.status; //either approval or denial

        //updates status in db
        await db.query ('UPDATE applications SET status =? where id = ?', [newStatus, appId]);
        
        //refresh page to show change
        res.redirect('/shelter/applications')
    }

    catch (err) {
        console.error(err);
        res.status(500).send("ERROR! ERROR UPDATE!")
    }

});

// shelter profile get & render its view
app.get('/shelter/profile', ShelterChecker, (req,res) => {
    res.render('shelter/profile');
});


//Start the server
app.listen(PORT, () => {
     console.log(`Server running at http://localhost:${PORT}`);
});