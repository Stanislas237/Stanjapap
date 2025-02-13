export default [
    {
      ignores: ["node_modules/"], // Ignore les fichiers inutiles
      languageOptions: {
        ecmaVersion: "latest",
      },
      rules: {
        "no-console": "off", // Désactive les warnings sur console.log()
      },
    },
  ];
  