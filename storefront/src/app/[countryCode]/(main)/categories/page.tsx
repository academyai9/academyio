import { redirect } from "next/navigation"

export default async function CategoriesRedirectPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/courses-by-topics`)
}
