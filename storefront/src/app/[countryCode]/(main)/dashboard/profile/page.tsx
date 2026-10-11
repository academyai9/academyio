import { redirect } from "next/navigation"

export default async function ProfilePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/dashboard?tab=profile`)
}
