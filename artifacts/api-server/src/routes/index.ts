import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import contentRouter from "./content";
import postsRouter from "./posts";
import postInteractionsRouter from "./post-interactions";
import adminsRouter from "./admins";
import messagesRouter from "./messages";
import chatRouter from "./chat";
import storageRouter from "./storage";
import hadithsRouter from "./hadiths";
import hadithInteractionsRouter from "./hadith-interactions";
import userProfileRouter from "./user-profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(contentRouter);
router.use(postsRouter);
router.use(postInteractionsRouter);
router.use(hadithsRouter);
router.use(hadithInteractionsRouter);
router.use(adminsRouter);
router.use(messagesRouter);
router.use(chatRouter);
router.use(storageRouter);
router.use(userProfileRouter);

export default router;
