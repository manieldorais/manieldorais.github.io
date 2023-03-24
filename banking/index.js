const express = require("express")
const path = require('path')

const app = express();
const _dirname="./";
app.use('/', express.static(path.join(_dirname, '/')))
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
});
app.listen(5000, () => {
    console.log('Listening on port ' + 5000);
});