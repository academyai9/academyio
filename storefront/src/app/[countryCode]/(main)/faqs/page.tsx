import { redirect } from "next/navigation"

export default async function FaqsRedirect(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/faq`)
}
