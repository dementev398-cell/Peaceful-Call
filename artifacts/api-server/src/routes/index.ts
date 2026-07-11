import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import contentRouter from "./content";
import faqRouter from "./faq";
import adminStatsRouter from "./admin-stats";
import postsRouter from "./posts";
import postInteractionsRouter from "./post-interactions";
import adminsRouter from "./admins";
import messagesRouter from "./messages";
import chatRouter from "./chat";
import storageRouter from "./storage";
import hadithsRouter from "./hadiths";
import hadithInteractionsRouter from "./hadith-interactions";
import userProfileRouter from "./user-profile";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(contentRouter);
router.use(faqRouter);
router.use(adminStatsRouter);
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
