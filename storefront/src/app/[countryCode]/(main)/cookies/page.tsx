import { redirect } from "next/navigation"

export default async function CookiesRedirect(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/cookie-policy`)
}
