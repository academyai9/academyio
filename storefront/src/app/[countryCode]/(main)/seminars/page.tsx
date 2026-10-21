import { redirect } from "next/navigation"

export default async function SeminarsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/webinars`)
}
