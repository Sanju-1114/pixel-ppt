import { getSession } from '#/lib/auth.function'
import { useFullscreen } from '#/features/presentations/hooks/use-fullscreen'
import { usePresentationDetail } from '#/features/presentations/hooks/use-presentation-detail'

import {
  LAYOUT_OPTIONS,
  SLIDE_STYLES,
  TONE_OPTIONS,
} from '#/features/presentations/constants/presentation-options'

import { presentationThumbnailUrl } from '#/features/presentations/utils/thumbnail-url'
import { GenerationStatus } from '#/features/presentations/components/generation-status'
import { SlideCard } from '#/features/presentations/components/slide-card'
import { SlidePreview } from '#/features/presentations/components/slide-preview'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'

import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import { Slider } from '#/components/ui/slider'
import { Textarea } from '#/components/ui/textarea'

import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Play,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { SlideshowModal } from '#/features/presentations/components/slideshow-modal'
import { exportToPptx } from '#/features/presentations/lib/export-pptx'

export const Route = createFileRoute('/presentations/$presentationId')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    return {
      user: session.user,
    }
  },

  component: PresentationDetailPage,
})

function PresentationDetailPage() {
  const { presentationId } = Route.useParams()

  const navigate = useNavigate()
  const router = useRouter()

  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const {
    query,
    slides,
    isGenerating,
    updatedLabel,
    form,
    setForm,
    updateMut,
    regenerateMut,
    deleteMut,
  } = usePresentationDetail(presentationId, {
    onDeleted: () => {
      navigate({
        to: '/',
      })
    },
  })

  const { isFullscreen, toggleFullscreen } = useFullscreen(
    'slide-preview-container',
  )

  const handleExportPptx = useCallback(async () => {
    const data = query.data

    if (!data) return

    if (slides.length === 0) {
      toast.error('There are no slides to export')
      return
    }

    setIsExporting(true)

    try {
      const filename = await exportToPptx({
        title: data.title,
        slides,
      })

      toast.success(`Exported as ${filename}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Export failed',
      )
    } finally {
      setIsExporting(false)
    }
  }, [query.data, slides])

  /*
   * Loading state
   */
  if (query.isPending) {
    return (
      <main className="min-h-screen px-4 pt-24 pb-12">
        <div className="mx-auto max-w-6xl text-muted-foreground">
          Loading presentation…
        </div>
      </main>
    )
  }

  /*
   * Error state
   */
  if (query.isError) {
    const error = query.error

    return (
      <main className="min-h-screen px-4 pt-24 pb-12">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-destructive">
            {error instanceof Error
              ? error.message
              : 'Something went wrong'}
          </p>

          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              router.navigate({
                to: '/',
              })
            }
          >
            Back home
          </Button>
        </div>
      </main>
    )
  }

  const data = query.data
  const thumb = presentationThumbnailUrl(data.id)
  const activeSlide = slides.at(activeSlideIndex)

  return (
    <main className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 rounded-xl"
              onClick={() =>
                router.navigate({
                  to: '/',
                })
              }
            >
              <ArrowLeft className="size-4" />
              Home
            </Button>

            <GenerationStatus status={data.status} />
          </div>

          <span className="text-sm text-muted-foreground">
            Updated {updatedLabel}
          </span>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">

          {/* Main content */}
          <div className="flex-1 space-y-4">

            {/* Presentation header */}
            <div className="glass flex items-center gap-4 rounded-2xl p-4">
              <img
                src={thumb}
                alt=""
                width={56}
                height={56}
                className="rounded-xl border border-border/50 bg-background/30"
              />

              <div className="min-w-0 flex-1">
                <h1 className="truncate font-semibold">
                  {data.title}
                </h1>

                <p className="text-sm text-muted-foreground">
                  {slides.length} slides
                </p>
              </div>

              <div className="flex flex-wrap gap-2">

                {/* Slideshow */}
                {slides.length > 0 && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 rounded-xl"
                      onClick={() =>
                        setShowSlideshow(true)
                      }
                    >
                      <Play className="size-4" />

                      <span className="hidden sm:inline">
                        Slideshow
                      </span>
                    </Button>

                    {/* Export */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 rounded-xl"
                      onClick={handleExportPptx}
                      disabled={isExporting}
                    >
                      <Download className="size-4" />

                      <span className="hidden sm:inline">
                        {isExporting
                          ? 'Exporting…'
                          : 'Export'}
                      </span>
                    </Button>
                  </>
                )}

                {/* Regenerate */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-xl"
                  disabled={
                    regenerateMut.isPending ||
                    isGenerating
                  }
                  onClick={() =>
                    regenerateMut.mutate()
                  }
                >
                  <RefreshCw
                    className={`size-4 ${
                      isGenerating
                        ? 'animate-spin'
                        : ''
                    }`}
                  />

                  <span className="hidden sm:inline">
                    {isGenerating
                      ? 'Generating…'
                      : 'Regenerate'}
                  </span>
                </Button>

                {/* Settings */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    setShowSettings((value) => !value)
                  }
                >
                  {showSettings
                    ? 'Hide settings'
                    : 'Edit settings'}
                </Button>
              </div>
            </div>

            {/* Settings */}
            {showSettings && (
              <div className="glass space-y-4 rounded-2xl p-6">

                {/* Title */}
                <div className="space-y-2">
                  <Label
                    htmlFor="pres-title"
                    className="text-sm font-medium"
                  >
                    Title
                  </Label>

                  <input
                    id="pres-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        title: event.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>

                {/* Prompt */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Prompt
                  </Label>

                  <Textarea
                    value={form.prompt}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        prompt: event.target.value,
                      }))
                    }
                    className="min-h-[120px] resize-y rounded-xl border-border/50 bg-background/50 text-sm"
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

                  {/* Slide count */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Slides: {form.slideCount}
                    </Label>

                    <Slider
                      value={[form.slideCount]}
                      onValueChange={(value) => {
                        const nextValue = Array.isArray(value)
                          ? value[0]
                          : value

                        if (typeof nextValue !== 'number') {
                          return
                        }

                        setForm((state) => ({
                          ...state,
                          slideCount: nextValue,
                        }))
                      }}
                      min={3}
                      max={20}
                      step={1}
                      className="py-2"
                    />
                  </div>

                  {/* Style */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Style
                    </Label>

                    <Select
                      value={form.style}
                      onValueChange={(value) => {
                        if (
                          SLIDE_STYLES.some(
                            (item) =>
                              item.value === value,
                          )
                        ) {
                          setForm((state) => ({
                            ...state,
                            style: value as (typeof SLIDE_STYLES)[number]['value'],
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="glass">
                        {SLIDE_STYLES.map((style) => (
                          <SelectItem
                            key={style.value}
                            value={style.value}
                          >
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Tone
                    </Label>

                    <Select
                      value={form.tone}
                      onValueChange={(value) => {
                        if (
                          TONE_OPTIONS.some(
                            (item) =>
                              item.value === value,
                          )
                        ) {
                          setForm((state) => ({
                            ...state,
                            tone: value as (typeof TONE_OPTIONS)[number]['value'],
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="glass">
                        {TONE_OPTIONS.map((tone) => (
                          <SelectItem
                            key={tone.value}
                            value={tone.value}
                          >
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Layout */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Layout
                    </Label>

                    <Select
                      value={form.layout}
                      onValueChange={(value) => {
                        if (
                          LAYOUT_OPTIONS.some(
                            (item) =>
                              item.value === value,
                          )
                        ) {
                          setForm((state) => ({
                            ...state,
                            layout: value as (typeof LAYOUT_OPTIONS)[number]['value'],
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="glass">
                        {LAYOUT_OPTIONS.map((layout) => (
                          <SelectItem
                            key={layout.value}
                            value={layout.value}
                          >
                            {layout.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Save/Delete */}
                <div className="flex flex-wrap justify-between gap-3 pt-2">

                  {/* IMPORTANT:
                      Base UI AlertDialogTrigger already renders
                      a <button>. Therefore we use `render`
                      to make our Button the actual trigger.
                  */}
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-2 rounded-xl"
                          disabled={deleteMut.isPending}
                        />
                      }
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </AlertDialogTrigger>

                    <AlertDialogContent className="glass">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete presentation?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                          This action cannot be undone.
                          This will permanently delete
                          your presentation and all its
                          slides.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">
                          Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                          className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() =>
                            deleteMut.mutate()
                          }
                        >
                          {deleteMut.isPending
                            ? 'Deleting…'
                            : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Save */}
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 rounded-xl"
                    disabled={
                      updateMut.isPending ||
                      !form.title.trim() ||
                      !form.prompt.trim()
                    }
                    onClick={() =>
                      updateMut.mutate()
                    }
                  >
                    <Save className="size-4" />

                    {updateMut.isPending
                      ? 'Saving…'
                      : 'Save changes'}
                  </Button>
                </div>
              </div>
            )}

            {/* Active slide */}
            {activeSlide && (
              <div className="space-y-3">

                <div
                  id="slide-preview-container"
                  className="group relative"
                >
                  <SlidePreview
                    slide={activeSlide}
                    isFullscreen={isFullscreen}
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={`absolute right-3 top-3 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 ${
                      isFullscreen
                        ? 'opacity-100'
                        : ''
                    }`}
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="size-4" />
                  </Button>
                </div>

                {/* Slide navigation */}
                <div className="flex items-center justify-between">

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-xl"
                    disabled={activeSlideIndex === 0}
                    onClick={() =>
                      setActiveSlideIndex(
                        (index) =>
                          Math.max(0, index - 1),
                      )
                    }
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    {activeSlideIndex + 1} / {slides.length}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-xl"
                    disabled={
                      activeSlideIndex >=
                      slides.length - 1
                    }
                    onClick={() =>
                      setActiveSlideIndex(
                        (index) =>
                          Math.min(
                            slides.length - 1,
                            index + 1,
                          ),
                      )
                    }
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* No slides */}
            {slides.length === 0 && !isGenerating && (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  No slides yet. Click "Regenerate"
                  to create slides from your prompt.
                </p>

                <Button
                  type="button"
                  className="gap-2 rounded-xl"
                  onClick={() =>
                    regenerateMut.mutate()
                  }
                  disabled={regenerateMut.isPending}
                >
                  <RefreshCw className="size-4" />
                  Generate slides
                </Button>
              </div>
            )}

            {/* Generating */}
            {slides.length === 0 && isGenerating && (
              <div className="glass rounded-2xl p-12 text-center">
                <RefreshCw className="mx-auto mb-4 size-8 animate-spin text-primary" />

                <p className="text-muted-foreground">
                  Generating your presentation…
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  This may take a minute
                </p>
              </div>
            )}
          </div>

          {/* Slides sidebar */}
          {slides.length > 0 && (
            <aside className="flex flex-col lg:w-80 xl:w-96">
              <h2 className="px-2 pb-3 text-sm font-medium text-muted-foreground">
                Slides
              </h2>

              <div className="-mr-2 max-h-[calc(100vh-14rem)] flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                {slides.map((slide, index) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    isActive={
                      index === activeSlideIndex
                    }
                    onClick={() =>
                      setActiveSlideIndex(index)
                    }
                  />
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Slideshow */}
      {showSlideshow && (
        <SlideshowModal
          slides={slides}
          initialIndex={activeSlideIndex}
          onClose={() =>
            setShowSlideshow(false)
          }
        />
      )}
    </main>
  )
}