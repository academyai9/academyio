"use client"

import { useActionState, useState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import TurnstileWidget from "@components/captcha/TurnstileWidget"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const [captchaToken, setCaptchaToken] = useState("")

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        Become a Medusa Store Member
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        Create your Medusa Store Member profile, and get access to an enhanced
        shopping experience.
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="First name"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Last name"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
          <Input
            label="Phone Number *"
            name="phone"
            required
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Company / Firm Name"
            name="company_name"
            placeholder="Company / Firm Name LLP"
            autoComplete="organization"
            data-testid="company-name-input"
          />
          <Input
            label="Additional Attendee – Enter Email Id"
            name="additional_attendee_email"
            placeholder="colleague1@firm.com, colleague2@firm.com"
            autoComplete="email"
            data-testid="additional-attendee-email-input"
          />
          <Input
            label="PTIN# (Enrolled Agents only: Starts with P + 8 digits)"
            name="ptin"
            data-testid="ptin-input"
          />
          <Input
            label="CFP ID# (For CFP Designation holders only)"
            name="cfp_id"
            data-testid="cfp-id-input"
          />
        </div>

        {/* Anti-Bot Honeypot */}
        <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
          <input type="text" name="website_url_hp" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <div className="mt-4 w-full">
          <TurnstileWidget
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken("")}
          />
        </div>

        <ErrorMessage error={message} data-testid="register-error" />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          By creating an account, you agree to Medusa Store&apos;s{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            Privacy Policy
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            Terms of Use
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          Join
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        Already a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          Sign in
        </button>
        .
      </span>
    </div>
  )
}

export default Register
