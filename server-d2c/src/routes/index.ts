import { Router } from 'express'
import healthRoutes from './health'
import mastergoRoutes from './mastergo'
import generateRoutes from './generate'

const router = Router()

// Mount all routes
router.use(healthRoutes)
router.use(mastergoRoutes)
router.use(generateRoutes)

export default router
