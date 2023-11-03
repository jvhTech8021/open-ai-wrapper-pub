const express = require("express");

const buildConnectionAndRouter = require("./routes/router");

const startServer = async () => {
  const { router } = await buildConnectionAndRouter();

  const app = express();
  const port = process.env.PORT || 3000;

  app.use("/api", router);

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
};

startServer();
