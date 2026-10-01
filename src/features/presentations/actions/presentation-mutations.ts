import { createServerFn } from '@tanstack/react-start'

import { prisma } from '#/db'
import { inngest } from '#/integrations/inngest/client'
import { authMiddleware } from '#/middleware/auth'

import {
  deriveTitle,
  requirePresentationUserId,
} from '../lib/server-helpers'

import {
  createPresentationInputSchema,
  presentationIdInputSchema,
  updatePresentationInputSchema,
} from '../types/schemas'

/**
 * Create a new presentation
 *
 * Security:
 * 1. authMiddleware rejects unauthenticated requests.
 * 2. requirePresentationUserId() verifies the session again.
 * 3. The presentation is created with the authenticated user's ID.
 * 4. Input is validated with Zod before reaching the handler.
 */
export const createPresentation = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    createPresentationInputSchema.parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const userId = await requirePresentationUserId()

    const presentation = await prisma.presentation.create({
      data: {
        userId,
        title: deriveTitle(data.prompt),
        prompt: data.prompt,
        slideCount: data.slideCount,
        style: data.style,
        tone: data.tone,
        layout: data.layout,
        status: 'GENERATING',
      },
    })

    await inngest.send({
      name: 'presentation/generate',
      data: {
        presentationId: presentation.id,
      },
    })

    return presentation
  })

/**
 * Update an existing presentation
 *
 * Security:
 * - User must be authenticated.
 * - The presentation must belong to the authenticated user.
 * - Only validated fields from updatePresentationInputSchema are accepted.
 */
export const updatePresentation = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    updatePresentationInputSchema.parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const userId = await requirePresentationUserId()

    const { id, ...patch } = data

    // Authorization check:
    // Never update a presentation only by ID.
    const existing = await prisma.presentation.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      throw new Error('Not found')
    }

    return prisma.presentation.update({
      where: {
        id,
      },
      data: patch,
    })
  })

/**
 * Delete a presentation
 *
 * Security:
 * - User must be authenticated.
 * - The presentation must belong to the authenticated user.
 */
export const deletePresentation = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    presentationIdInputSchema.parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const userId = await requirePresentationUserId()

    // Authorization check
    const existing = await prisma.presentation.findFirst({
      where: {
        id: data.id,
        userId,
      },
    })

    if (!existing) {
      throw new Error('Not found')
    }

    await prisma.presentation.delete({
      where: {
        id: data.id,
      },
    })

    return {
      ok: true as const,
    }
  })

/**
 * Regenerate an existing presentation
 *
 * Security:
 * - User must be authenticated.
 * - The presentation must belong to the authenticated user.
 * - Only the authenticated owner can trigger regeneration.
 */
export const regeneratePresentation = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) =>
    presentationIdInputSchema.parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const userId = await requirePresentationUserId()

    // Authorization check
    const existing = await prisma.presentation.findFirst({
      where: {
        id: data.id,
        userId,
      },
    })

    if (!existing) {
      throw new Error('Not found')
    }

    const presentation = await prisma.presentation.update({
      where: {
        id: data.id,
      },
      data: {
        status: 'GENERATING',
      },
    })

    await inngest.send({
      name: 'presentation/generate',
      data: {
        presentationId: presentation.id,
      },
    })

    return presentation
  })

