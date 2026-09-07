import { AppLayout } from '../layouts/AppLayout'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppLayout title={title} description={description}>
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </section>
    </AppLayout>
  )
}
