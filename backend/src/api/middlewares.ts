import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import { customerRegistrationCaptchaMiddleware } from "./middlewares/captcha"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/auth/customer/emailpass/register",
      method: "POST",
      middlewares: [
        customerRegistrationCaptchaMiddleware,
      ],
    },
    {
      matcher: "/store/customer/*",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/orders/:id/invoice",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/admin/overview*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/categories*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/testimonials*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/organizations*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/quizzes*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/certificates*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/webinars*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/speakers*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/subscriptions*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/customer-subscriptions*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/entitlements*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/orders-dashboard*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/orders-management*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/promotions*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/webinar-files/stream-upload",
      bodyParser: false,
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/webinar-files/local-upload",
      bodyParser: false,
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/webinar-files*",
      bodyParser: {
        sizeLimit: "10mb",
      },
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/customers*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/customers-directory*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/contact-info*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/tracking-codes*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/newsletter-subscribers*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/newsletter-campaigns*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/payment-methods*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/pages*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/credits*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/other-info*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/social-media*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/custom*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
  ],
})
