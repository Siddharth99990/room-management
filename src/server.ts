import app from "./app";
import { connectDatabase } from "./config/connectDatabase";

const PORT=process.env.PORT;

connectDatabase();

app.listen(PORT,()=>{
    console.log(`Server active on port ${PORT}`);
})