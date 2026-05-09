require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function seedDatabase() {
  try {
    const seedFilePath = path.join(__dirname, '..', 'medical_resources_seed.json');
    const data = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

    // Insert Doctors
    console.log('Seeding doctors...');
    for (const doc of data.doctors) {
      await pool.query(
        `INSERT INTO doctors (id, name, specialty, degree, workplace, experience, treatment_focus, price_reference, url_avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           specialty = EXCLUDED.specialty,
           degree = EXCLUDED.degree,
           workplace = EXCLUDED.workplace,
           experience = EXCLUDED.experience,
           treatment_focus = EXCLUDED.treatment_focus,
           price_reference = EXCLUDED.price_reference,
           url_avatar = EXCLUDED.url_avatar`,
        [doc.id, doc.name, doc.specialty, doc.degree, doc.workplace, doc.experience, JSON.stringify(doc.treatment_focus), doc.price_reference, doc.url_avatar]
      );
    }
    console.log(`Seeded ${data.doctors.length} doctors`);

    // Insert Clinics (hospitals)
    console.log('Seeding clinics...');
    for (const hosp of data.hospitals) {
      await pool.query(
        `INSERT INTO clinics (id, name, address, department, working_hours, services, price_reference, url_avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           department = EXCLUDED.department,
           working_hours = EXCLUDED.working_hours,
           services = EXCLUDED.services,
           price_reference = EXCLUDED.price_reference,
           url_avatar = EXCLUDED.url_avatar`,
        [hosp.id, hosp.name, hosp.address, hosp.department, hosp.working_hours, JSON.stringify(hosp.services), hosp.price_reference, hosp.url_avatar]
      );
    }
    console.log(`Seeded ${data.hospitals.length} clinics`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();
