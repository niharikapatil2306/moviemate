const express = require('express');
const app = express();

const PORT = 8080;

app.use(express.json());

app.get('/', (req,res) =>{
  res.send("API is up!!")
  console.log("hello")
})

app.listen(PORT, ()=>{
  console.log(`running at http://localhost:${PORT}`)
})