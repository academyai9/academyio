import { redirect } from "next/navigation"

export default async function CookiePreferencesRedirect(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/cookie-policy`)
}
