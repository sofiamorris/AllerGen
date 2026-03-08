import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import OpenAI from "openai";
import multer from "multer";
import recipesRouter from "./routes/recipes.js";
import commentsRouter from "./routes/comments.js";
import likesRouter from "./routes/likes.js";

dotenv.config();

const { MONGO_CONNECTION_STRING } = process.env;

mongoose.set("debug", true);
mongoose.connect(MONGO_CONNECTION_STRING)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.error("MongoDB connection error:", error));

const app = express();
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const upload = multer({ storage: multer.memoryStorage() });

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow no-origin requests (curl, Postman, Render health checks)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-user-email"],
}));

// ensure OPTIONS preflight always gets handled
// app.options("*", cors());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

app.use((req, _res, next) => {
  const email = (req.header("x-user-email") || "").trim().toLowerCase();
  req.userEmail = email || null;
  next();
});

app.use("/api/recipes", recipesRouter);
app.use("/api", commentsRouter);
app.use("/api", likesRouter);

app.listen(process.env.PORT, () => {
  console.log("REST API is listening.");
});

//default route
app.get("/", (req, res) => {
  res.status(200).send({ message: "Welcome to AllerGen!" });
});

app.post("/api/recipes/generate", upload.single("file"), async (req, res) => {
  try {
    console.log("entered api request");

    const notes = String(req.body.notes || "");

    let diet = [];
    const rawDiet = req.body.diet;
    if (Array.isArray(rawDiet)) {
      diet = rawDiet;
    } else if (typeof rawDiet === "string") {
      try {
        diet = JSON.parse(rawDiet);
      } catch {
        diet = rawDiet ? [rawDiet] : [];
      }
    }

    let uploaded = null;

    if (req.file) {
      const mimeType = req.file.mimetype || "application/octet-stream";
      const originalName = req.file.originalname || "upload";
    
      const blob = new Blob([req.file.buffer], { type: mimeType });
      const fileForUpload = new File([blob], originalName, { type: mimeType });
    
      uploaded = await client.files.create({
        file: fileForUpload,
        purpose: "assistants",
      });
    }

    // const systemPrompt = `
    // You are a helpful cooking assistant. Read the attached file (recipe scan/PDF)
    // and the user's notes and dietary preferences. Provide a new recipe with:
    // - An "Ingredients" section (bulleted list)
    // - An "Instructions" section (numbered steps)
    // Within the recipe, suggest one substitution for each ingredient that conflicts
    // with the diets. After that, include a "Substitutions" section listing other
    // viable alternatives for each replaced ingredient. Strictly list substitutions 
    // as real, measurable ingredients
    // `;
    
    // const developerPrompt = `
    // Follow this exact Markdown format:
    
    // ## Ingredients
    // - <bulleted items>
    
    // ## Instructions
    // 1. <numbered steps>
    
    // ## Substitutions
    // - <ingredient>: <other possible substitutions>
    // `;

    const systemPrompt = `
You are a helpful cooking assistant. Read the attached recipe (scan, PDF, or text)
along with the user's notes and dietary preferences.

Your task:
1. Identify ingredients in the original recipe that conflict with the user's dietary preferences.
2. Replace only those conflicting ingredients with suitable alternatives in the "Ingredients" list.
3. Keep all non-conflicting ingredients unchanged.
4. Create a title that represents the modified recipe
4. After writing the recipe, provide a "Substitutions" section that lists *only* the replaced ingredients.
5. In that section, list a few realistic alternative ingredients separated by commas (no full sentences, no "or", no extra wording).
6. Each substitution entry must use only ingredient names that could be directly substituted into a recipe.
`;

const developerPrompt = `
Follow this exact Markdown format:

## Title
<alternate recipe title>

## Ingredients
<list of final ingredients, replacing only those that conflict>

## Instructions
<cooking steps>

## Substitutions
<new ingredient name>: <comma-separated alternative ingredients>

Formatting rules:
- The "Substitutions" section should list only ingredients that were replaced.
- The ingredient name before the colon must match the NEW name shown in the Ingredients section.
- Each substitution line must follow this pattern exactly:
  - <new ingredient>: <alt1>, <alt2>, <alt3>
- Do not include sentences or conjunctions like “or” or “and”.
- Example:
  - Vegan butter: coconut oil, canola oil, margarine
  - Flax eggs: chia eggs, applesauce, commercial egg replacer
  - Vegan chocolate chips: dark chocolate chunks, carob chips, dairy-free chocolate
`;


    const userText = [
      `Dietary preferences: ${diet.join(", ") || "none specified"}`,
      `Notes: ${notes || "no extra notes"}`,
      "Use the attached file for context.",
    ].join("\n");

    console.log("sending request");

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: [{ 
            type: "input_text", 
            text: systemPrompt 
          }],
        },
        {
          role: "developer",
          content: [{ 
            type: "input_text", 
            text: developerPrompt 
          }],
        },
        {
          role: "user",
          content: [
            { 
              type: "input_text", 
              text: userText 
            },
            { 
              type: "input_file",
               file_id: uploaded.id 
            },
          ],
        },
      ]
    });

    const resultText =
    response.output?.[0]?.content?.[0]?.text ?? JSON.stringify(response);

    console.log(resultText);

        //  const resultText = `
        // ## Title
        // Gluten-Free No Knead Artisan Bread
        
        // ## Ingredients
        // - 3 cups (450g) gluten-free all-purpose flour blend (with xanthan gum)
        // - 2 tsp instant or rapid rise yeast
        // - 2 tsp cooking / kosher salt, NOT table salt
        // - 1 1/2 cups (375 ml) very warm tap water (NOT boiling or super hot, up to 55°C/130°F)
        // - 1 1/2 tbsp gluten-free flour blend, for dusting
        
        // ## Instructions
        // 1. **Mix Dough:** In a large bowl, mix together the gluten-free flour blend, yeast, and salt. Add the water and stir with the handle of a wooden spoon until all flour is incorporated. The dough will be wet and shaggy (not runny like cake batter). Adjust the consistency by adding a bit more water or gluten-free flour as needed.
        // 2. **Rise:** Cover the bowl with cling wrap or a plate. Let the dough rise on the counter for 2–3 hours, until it has doubled in size, looks bubbly on top, and wobbles like jelly.
        // 3. **Optional – Refrigerate for Flavor Development:** At this stage, you can refrigerate the dough (in the bowl, covered) for up to 3 days. If refrigerated, let the dough sit at room temperature for 45–60 minutes before baking.
        // 4. **Preheat Oven:** Place a Dutch oven (with lid) in the oven and preheat to 230°C/450°F (220°C fan) for 30 minutes prior to baking.
        // 5. **Shape Dough:** Sprinkle your work surface with 1 tbsp gluten-free flour blend. Scrape the dough onto the flour and sprinkle the top with 1/2 tbsp more flour. Use a dough scraper or similar to fold the sides inwards about 6 times to roughly form a round shape.
        // 6. **Transfer to Paper:** Place a large piece of parchment paper near the dough and flip the dough seam-side down onto the paper. Reshape gently into a round.
        // 7. **Dough in Pot:** Carefully remove the hot Dutch oven from the oven. Use the parchment paper to lift and lower the dough into the pot. Cover with the lid.
        // 8. **Bake:** Bake covered for 30 minutes, then remove the lid and bake another 12 minutes until the bread is deep golden and crispy.
        // 9. **Cool:** Remove the bread and let it cool on a rack for at least 10 minutes before slicing.
        
        // ## Substitutions
        // gluten-free all-purpose flour blend: oat flour blend, almond flour blend, 1:1 gluten-free baking flour`;

    const sections = resultText.split(/## /).reduce((acc, section) => {
      if (section.startsWith("Title")) acc.title = section.replace("Title", "").trim();
      else if (section.startsWith("Ingredients")) acc.ingredients = section.replace("Ingredients", "").trim();
      else if (section.startsWith("Instructions")) acc.instructions = section.replace("Instructions", "").trim();
      else if (section.startsWith("Substitutions")) acc.substitutions = section.replace("Substitutions", "").trim();
      return acc;
    }, { title: "", ingredients: "", instructions: "", substitutions: "" });

    const title = sections.title;

    console.log(title);
    const ingredientsList = sections.ingredients
      .split(/\n+/)
      .map(line => line.replace(/^[-\d.]+\s*/, "").trim())
      .filter(Boolean);

    const instructionsList = sections.instructions
      .split(/\n+/)
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);

    const substitutionsList = sections.substitutions
      .split(/\n+/)
      .map(line => line.replace(/^[-\d.]+\s*/, "").trim())
      .filter(Boolean);

    res.json({
      resultText,
      title,
      ingredientsList,
      instructionsList,
      substitutionsList,
      // responseId: response.id,
      responseId: 123456,
      fileId: uploaded?.id || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Server error" });
  }

    // res.json({
    //   resultText,
    //   responseId: response.id,
    //   fileId: uploaded.id,
    // });
  // } 
  // catch (err) {
  //   console.error(err);
  //   res.status(500).json({ error: err?.message || "Server error" });
// }


// app.listen(port, () => {
//   console.log(
//     `Example app listening at http://localhost:${port}`
//   );
});

