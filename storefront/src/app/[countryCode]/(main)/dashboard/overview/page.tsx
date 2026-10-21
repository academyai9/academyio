import { redirect } from "next/navigation"

export default async function OverviewPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/dashboard?tab=overview`)
}
