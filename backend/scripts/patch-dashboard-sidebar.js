const fs = require("fs");
const path = require("path");

const dashboardDist = path.join(__dirname, "../node_modules/@medusajs/dashboard/dist");

function patchFile(filename, replacer) {
  const filePath = path.join(dashboardDist, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`[patch] ${filename} not found, skipping.`);
    return;
  }
  const bakPath = filePath + ".bak";
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(filePath, bakPath);
  }
  let content = fs.readFileSync(filePath, "utf8");
  const newContent = replacer(content);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`[patch] Successfully patched ${filename}`);
  } else {
    console.log(`[patch] ${filename} already patched or pattern not found.`);
  }
}

// 1. Patch home-KFQGXKRT.mjs so root redirects to /dashboard (Overview)
patchFile("home-KFQGXKRT.mjs", (code) => {
  return code.replace(
    /navigate\(["']\/orders["'],\s*\{\s*replace:\s*true\s*\}\)/g,
    'navigate("/dashboard", { replace: true })'
  );
});

// 2. Patch chunk-QIJSUXW3.mjs (ESM used by Vite)
patchFile("chunk-QIJSUXW3.mjs", (code) => {
  let result = code;

  // A. Patch SidebarRoutes
  const startTarget = "var SidebarRoutes = () => {";
  const endTarget = "var UtilitySection";
  const start = result.indexOf(startTarget);
  if (start !== -1) {
    const end = result.indexOf(endTarget, start);
    if (end !== -1) {
      const replacement = `var SidebarRoutes = () => {
  const coreRoutes = useCoreRoutes();
  const { getMenu } = useExtension();
  const menuItems = getMenu("coreExtensions") || [];

  const findExt = (path) => menuItems.find((i) => i.to === path);

  const overviewItem = findExt("/dashboard") || {
    to: "/dashboard",
    label: "Overview",
    icon: /* @__PURE__ */ jsx16(SquaresPlus, {})
  };

  const ordersItem = {
    to: "/orders-management",
    label: "Orders",
    icon: /* @__PURE__ */ jsx16(ShoppingCart, {}),
    items: [
      { label: "Orders Hub", to: "/orders-management" },
      { label: "Order Monitoring", to: "/order-monitoring" },
      { label: "Payment Methods", to: "/payment-methods" },
      { label: "Subscriptions", to: "/subscriptions" }
    ]
  };

  const customersItem = {
    to: "/customers",
    label: "Customers",
    icon: /* @__PURE__ */ jsx16(Users, {}),
    items: [
      { label: "Customer Directory", to: "/customers" },
      { label: "Registrations & Access", to: "/entitlements" },
      { label: "Customer Groups", to: "/customer-groups" }
    ]
  };

  const webinarsItem = {
    to: "/webinars",
    label: "Webinars & Courses",
    icon: findExt("/webinars")?.icon || /* @__PURE__ */ jsx16(Tag, {}),
    items: [
      { label: "All Webinars", to: "/webinars" },
      { label: "Categories", to: "/categories" },
      { label: "Faculty & Instructors", to: "/speakers" },
      { label: "Learning Materials & S3", to: "/webinar-files" },
      { label: "CPE Certificates", to: "/certificates" },
      { label: "Webinar Quizzes", to: "/quizzes" }
    ]
  };

  const marketingItem = {
    to: "/promotions",
    label: "Content & Marketing",
    icon: findExt("/promotions")?.icon || /* @__PURE__ */ jsx16(SquaresPlus, {}),
    items: [
      { label: "Promotions & Banners", to: "/promotions" },
      { label: "Regulatory Bodies", to: "/organizations" },
      { label: "Credits Management", to: "/credits" },
      { label: "Other Information", to: "/other-info" },
      { label: "Company Address", to: "/contact-info" },
      { label: "Social Media", to: "/social-media" },
      { label: "Testimonials", to: "/testimonials" }
    ]
  };

  const policiesItem = {
    to: "/privacy-policy",
    label: "Policies & Legal",
    icon: findExt("/privacy-policy")?.icon || /* @__PURE__ */ jsx16(SquaresPlus, {}),
    items: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Refund Policy", to: "/refund-policy" }
    ]
  };

  const settingsItem = {
    to: "/settings/tracking-codes",
    label: "Settings",
    icon: /* @__PURE__ */ jsx16(CogSixTooth, {}),
    items: [
      { label: "Frontend Tracking Codes", to: "/settings/tracking-codes" },
      { label: "Company Address & Contact", to: "/contact-info" }
    ]
  };

  const finalNavItems = [
    overviewItem,
    ordersItem,
    customersItem,
    webinarsItem,
    marketingItem,
    policiesItem,
    settingsItem
  ];

  return /* @__PURE__ */ jsx16("nav", { className: "py-3", children: /* @__PURE__ */ jsx16("div", { className: "px-3", children: /* @__PURE__ */ jsx16(
    LayoutComposer,
    {
      widgetsZonePrefix: "sidebar",
      preferredLayoutId: CORE_LAYOUT_IDS2.SINGLE_COLUMN,
      hasOutlet: false,
      disableWidgets: true,
      customizeId: CUSTOMIZE_IDS.MAIN_SIDEBAR,
      controlSize: "small",
      layoutProps: {
        className: "gap-y-1"
      },
      sections: {
        main: /* @__PURE__ */ jsxs9(Fragment4, { children: [
          /* @__PURE__ */ jsx16(LayoutComposer.Entry, { id: "Searchbar", children: /* @__PURE__ */ jsx16(Searchbar, {}) }),
          finalNavItems.map((item) => /* @__PURE__ */ jsx16(LayoutComposer.Entry, { id: \`nav:\${item.to}\`, children: /* @__PURE__ */ jsx16(
            NavItem,
            {
              to: item.to,
              label: item.label,
              icon: item.icon ? item.icon : /* @__PURE__ */ jsx16(SquaresPlus, {}),
              items: item.items,
              translationNs: item.translationNs,
              type: "extension"
            },
            item.to
          ) }, item.to))
        ] })
      }
    }
  ) }) });
};
`;
      result = result.substring(0, start) + replacement + result.substring(end);
    }
  }

  // B. Patch Topbar to include Day/Night toggle
  const topbarStart = result.indexOf("var Topbar = () => {");
  if (topbarStart !== -1) {
    const topbarEnd = result.indexOf("var DesktopSidebarContainer", topbarStart);
    if (topbarEnd !== -1) {
      const topbarReplacement = `var DayNightToggle = () => {
  const [isDark, setIsDark] = useState11(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("medusa_admin_theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect10(() => {
    const apply = (dark) => {
      const el = document.documentElement;
      if (dark) {
        el.classList.add("dark");
        el.setAttribute("data-mode", "dark");
        el.style.colorScheme = "dark";
      } else {
        el.classList.remove("dark");
        el.setAttribute("data-mode", "light");
        el.style.colorScheme = "light";
      }
    };
    apply(isDark);
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("medusa_admin_theme", next ? "dark" : "light");
      return next;
    });
  };

  return /* @__PURE__ */ jsx14("button", {
    type: "button",
    onClick: toggle,
    title: isDark ? "Switch to Day View (Light)" : "Switch to Night View (Dark)",
    "aria-label": isDark ? "Switch to Day View (Light)" : "Switch to Night View (Dark)",
    className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover text-ui-fg-base border-ui-border-base",
    children: [
      isDark
        ? /* @__PURE__ */ jsxs7("span", { className: "flex items-center gap-1.5 text-amber-500 font-medium", children: [
            /* @__PURE__ */ jsx14("svg", { className: "w-4 h-4 fill-current", viewBox: "0 0 20 20", children: [
              /* @__PURE__ */ jsx14("path", { fillRule: "evenodd", d: "M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z", clipRule: "evenodd" })
            ] }),
            /* @__PURE__ */ jsx14("span", { className: "text-ui-fg-base text-xs font-semibold hidden sm:inline", children: "Day Mode" })
          ] })
        : /* @__PURE__ */ jsxs7("span", { className: "flex items-center gap-1.5 text-indigo-500 font-medium", children: [
            /* @__PURE__ */ jsx14("svg", { className: "w-4 h-4 fill-current", viewBox: "0 0 20 20", children: [
              /* @__PURE__ */ jsx14("path", { d: "M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" })
            ] }),
            /* @__PURE__ */ jsx14("span", { className: "text-ui-fg-base text-xs font-semibold hidden sm:inline", children: "Night Mode" })
          ] })
    ]
  });
};
var Topbar = () => {
  return /* @__PURE__ */ jsxs7("div", { className: "grid w-full grid-cols-2 border-b p-3", children: [
    /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-x-1.5", children: [
      /* @__PURE__ */ jsx14(ToggleSidebar, {}),
      /* @__PURE__ */ jsx14(Breadcrumbs, {})
    ] }),
    /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-end gap-x-3", children: [
      /* @__PURE__ */ jsx14(DayNightToggle, {}),
      /* @__PURE__ */ jsx14(CustomizerMenu, {}),
      /* @__PURE__ */ jsx14(LayoutCustomizerSlot, { location: LAYOUT_CONTROLS_LOCATION }),
      /* @__PURE__ */ jsx14(
        LayoutComposer,
        {
          widgetsZonePrefix: "topbar",
          preferredLayoutId: CORE_LAYOUT_IDS.SINGLE_ROW,
          sections: {
            main: /* @__PURE__ */ jsx14(LayoutComposer.Entry, { id: "Notifications", children: /* @__PURE__ */ jsx14(Notifications, {}) })
          },
          hasOutlet: false,
          customizeId: CUSTOMIZE_IDS.TOPBAR,
          controlSize: "xsmall"
        }
      )
    ] })
  ] });
};
`;
      result = result.substring(0, topbarStart) + topbarReplacement + result.substring(topbarEnd);
    }
  }

  return result;
});

// 3. Patch backend/.medusa/client/index.html with immediate dark mode initialization
const indexPath = path.join(__dirname, "../.medusa/client/index.html");
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, "utf8");
  if (!indexHtml.includes("medusa_admin_theme")) {
    const script = `    <script>
      (function() {
        try {
          var t = localStorage.getItem("medusa_admin_theme");
          if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-mode", "dark");
            document.documentElement.style.colorScheme = "dark";
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-mode", "light");
            document.documentElement.style.colorScheme = "light";
          }
        } catch(e) {}
      })();
    </script>
</head>`;
    indexHtml = indexHtml.replace("</head>", script);
    fs.writeFileSync(indexPath, indexHtml, "utf8");
    console.log("[patch] Successfully added theme script to .medusa/client/index.html");
  }
}

console.log("[patch] Complete.");
