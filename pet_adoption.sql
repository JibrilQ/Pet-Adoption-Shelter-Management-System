-- Create database
CREATE DATABASE IF NOT EXISTS pet_adoption;
USE pet_adoption;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('shelter', 'adopter') NOT NULL,
    phone VARCHAR(30),
    city VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pets Table
CREATE TABLE pets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shelter_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100),
    age VARCHAR(50) NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    temperament VARCHAR(255) NOT NULL, 
    description TEXT NOT NULL,
    photo VARCHAR(255) NOT NULL,
    status ENUM('active', 'adopted') DEFAULT 'active' NOT NULL,
    date_listed DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shelter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Applications Table
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    adopter_id INT NOT NULL,
    home_setup TEXT NOT NULL,
    prior_pets TEXT NOT NULL,
    status ENUM('submitted', 'under_review', 'approved', 'declined') DEFAULT 'submitted' NOT NULL,
    contact_revealed TINYINT(1) DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (adopter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Prevents one person from applying several times for one pet (data integrity)
ALTER TABLE applications
ADD CONSTRAINT uq_pet_adopter UNIQUE (pet_id, adopter_id);

-- Create users (2 shelters, 1 adopter)
INSERT INTO users (username, name, email, password, role, phone, city) VALUES 
('shelter1', 'Hope Rescue', 'shelter1@test.com', 'p455w0rd', 'shelter', '07312 105 564', 'London'),
('shelter2', 'Second Chance', 'shelter2@test.com', 'p455w0rd', 'shelter', '07701 426 213', 'Coventry'),
('adopter1', 'Alice Smith', 'alice@test.com', 'p455w0rd', 'adopter', '07405 321 481', 'Birmingham');

-- Pet data

INSERT INTO pets (shelter_id, name, species, breed, age, size, temperament, description, photo, status, date_listed) VALUES
-- Shelter 1 Pets
((SELECT id FROM users WHERE username='shelter1'), 'Shadow', 'Dog', 'Pug', '4yrs', 'small', 'Friendly,Low-energy,Lap dog,Quiet', 'Shadow is a gentle giant. An affectionate pug who loves curling besides its owner to rest. A big fan of cuddles, short walks, and being close to its found family.', '/images/shadow.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter1'), 'Bailey', 'Dog', 'French Bulldog', '2yrs', 'medium', 'Playful,Good with children,Good with dogs,Trainable', 'Bailey is a cute and playful frenchie who loves to explore with its owner. Comfortable around friends and family alike, this frenchies courage knows no bounds.', '/images/bailey.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter1'), 'Poppy', 'Dog', 'Welsh Corgi', '1yrs', 'small', 'Energetic,Social,Good with children,Puppy', 'Poppy is an affectionate Corgi whose love for playtime is only beaten by its boundless love and affection for its family. They love to play and meet new pets and people. She is smart, social, full of personality and bound to be the talk of any party!', '/images/poppy.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter1'), 'Luna', 'Rabbit', 'Alaskan', '1yrs', 'small', 'Shy,Sweet,Gentle,Kind,Small', 'Luna is a gentle bunny who prefers a quiet, empty home. There are few things this pet loves more than its personal space, but once she gets to know her owner she is virtually inseperable.', '/images/luna_rabbit.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter1'), 'Cleo', 'Cat', 'Siamese', '2yrs', 'small', 'Playful,Vocal,Active,Exciteable,Cute', 'Cleo is a curious kitten who loves to explore on its own. A lone wolf type, its not one for idle play, but secretly loves her owner to dote on her every need.', '/images/cleo_kitten.jpg', 'active', CURDATE()),

-- Shelter 2 pets
((SELECT id FROM users WHERE username='shelter2'), 'Milo', 'Cat', 'Tabby', '3yrs', 'Small', 'Hyper, Cuddly,Active,Cute,Playful', 'Milo is a kitten who needs lots of toys. A capitalist through and through it loves to be constantly inundated with new toys. Hopefully you can keep up!', '/images/milo_kitten.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter2'), 'Daisy', 'Dog', 'Poodle', '6yrs', 'medium', 'Smart, Trained', 'Daisy knows many tricks and is very obedient. A ballerina in her past life she is deft and precise in all her movements.', '/images/daisy_dog.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter2'), 'Simba', 'Cat', 'Maine Coon', '3yrs', 'large', 'Vocal, Fluffy,Active,Playful,', 'Simba is a big cat with a big personality. With a lion-heart, ', '/images/simba_cat.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter2'), 'Coco', 'Guinea Pig', 'American', '1yrs', 'small', 'Squeaky, Social', 'Coco loves veggies and hanging out with friends. A health-nut that is sure to outlive her owner, hopefully you can keep up with her desire for long walks', '/images/coco.jpg', 'active', CURDATE()),
((SELECT id FROM users WHERE username='shelter2'), 'Buddy', 'Dog', 'Golden Retriever', '7yrs', 'large', 'Gentle,Loyal,Wise,Vocal,Social,Good with children', 'Buddy is a senior dog looking for a retirement home. An old spirit, wise beyond their years, surely there is alot you can learn from one who has seen so much.', '/images/buddy_dog.jpg', 'adopted', CURDATE());