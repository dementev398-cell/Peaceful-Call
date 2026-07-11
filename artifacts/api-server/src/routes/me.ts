import { Router, type IRouter } from "express";
import { resolveAdmin } from "../middlewares/adminAuth";
import { GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/me", async (req, res): Promise<void> => {
  const admin = await resolveAdmin(req);
  res.json(GetMeResponse.parse(admin ?? null));
});

export default router;
