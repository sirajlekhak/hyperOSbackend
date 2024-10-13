import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('combined'));
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your JSON file
const phonesFilePath = path.join(__dirname, 'public', 'phones.json');

// Helper functions
const readPhonesFromFile = () => {
  if (!fs.existsSync(phonesFilePath)) throw new Error('Phones file not found');
  const data = fs.readFileSync(phonesFilePath, 'utf-8');
  return JSON.parse(data);
};

const writePhonesToFile = (phones) => {
  fs.writeFileSync(phonesFilePath, JSON.stringify(phones, null, 2));
};

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the HyperOS Phone Management API.');
});

app.get('/phones', (req, res) => {
  try {
    const phones = readPhonesFromFile();
    res.json(phones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read phone data' });
  }
});

app.post('/phones', (req, res) => {
  try {
    const phones = readPhonesFromFile();
    const newPhone = { ...req.body };
    phones.push(newPhone);
    writePhonesToFile(phones);
    res.status(201).json(newPhone);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add phone' });
  }
});

app.put('/phones/:id', (req, res) => {
  try {
    const phones = readPhonesFromFile();
    const { id } = req.params;
    const index = phones.findIndex(phone => phone.id === id);

    if (index !== -1) {
      phones[index] = { ...phones[index], ...req.body };
      writePhonesToFile(phones);
      res.json(phones[index]);
    } else {
      res.status(404).send('Phone not found');
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update phone' });
  }
});

app.delete('/phones/:id', (req, res) => {
  try {
    const phones = readPhonesFromFile();
    const { id } = req.params;
    const filteredPhones = phones.filter(phone => phone.id !== id);

    if (phones.length !== filteredPhones.length) {
      writePhonesToFile(filteredPhones);
      res.status(204).send();
    } else {
      res.status(404).send('Phone not found');
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete phone' });
  }
});

app.post('/upload-phones', (req, res) => {
  if (!req.files || !req.files.phones) return res.status(400).send('No file was uploaded.');

  const uploadedFile = req.files.phones;
  if (uploadedFile.mimetype !== 'application/json') return res.status(400).send('Uploaded file must be a JSON file.');

  uploadedFile.mv(phonesFilePath, (err) => {
    if (err) return res.status(500).send('Failed to replace phones.json');
    fs.readFile(phonesFilePath, 'utf8', (err, data) => {
      if (err) return res.status(500).send('Failed to read new phones.json');
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (jsonError) {
        res.status(400).send('Invalid JSON format');
      }
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
