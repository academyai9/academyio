import { redirect } from "next/navigation"

export default async function DownloadsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/dashboard?tab=downloads`)
}
