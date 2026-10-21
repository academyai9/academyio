import { redirect } from "next/navigation"

export default async function CertificatesPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/dashboard?tab=certificates`)
}
