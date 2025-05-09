const express = require('express')
const app = express()
const port = 8080
const cors = require('cors')
const bodyParser = require('body-parser')
const helmet = require("helmet");
const path = require('path')
const fs = require("fs");

//Middleweew
app.use(bodyParser.json())
app.use(cors())
app.use(helmet())

app.use('/static', express.static(path.join(__dirname, '../src/assets')))

app.use('/game-state', (req, res) => {
  const filePath = path.join(__dirname, '../game_state.json');
  const response = JSON.parse(fs.readFileSync(filePath));

  return res.status(200).send(response);
});

app.use('/update-game-state', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../game_state.json');
    fs.writeFileSync(filePath, JSON.stringify(req.body));
    console.log('updated');
  } catch (e) {
    console.log(e);
  }
  
  return res.status(200).send({ message: 'Game state updated' });
});

app.use('/load-options', (req, res) => {
  const filePath = path.join(__dirname, '../game_settings.json');
  const response = JSON.parse(fs.readFileSync(filePath));

  return res.status(200).send(response);
});

app.use('/save-options', (req, res) => {

  try {
    const filePath = path.join(__dirname, '../game_settings.json');
    fs.writeFileSync(filePath, JSON.stringify(req.body));
    console.log('done')
  } catch (e) {
    console.log(e)
  }
  return res.status(200).send({ message: 'Received' });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})