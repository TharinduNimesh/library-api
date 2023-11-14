import express from "express";
import cors from "cors";

// Routes
import auth from './router/auth'; 

const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL  ,
}));

app.get('/', (req, res) => {
    res.send('Hello World')
});

app.use('/auth', auth);

app.listen(8080);

console.log('Library API running on http://localhost:8080');