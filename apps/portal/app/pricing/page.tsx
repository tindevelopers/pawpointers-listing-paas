import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { Metadata } from "next";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "PawPointers";

export const metadata: Metadata = {
  title: `Pricing for Pet Professionals - ${PLATFORM_NAME}`,
  description: `Affordable, transparent pricing plans for pet service providers. Choose from Starter, Pro, or Premium tiers to grow your pet business on ${PLATFORM_NAME}.`,
};

interface PricingTier {
  name: string;
  emoji: string;
  price: number;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter Paw",
    emoji: "🐾",
    price: 0,
    description: "Perfect for new or small businesses who want visibility.",
    features: [
      "Basic business profile",
      "Listed in one service category",
      "Contact details displayed",
      "Service area shown on map",
      "Ability to receive reviews",
      "3 photos in gallery",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro Paw",
    emoji: "🐶",
    price: 19,
    description:
      "For growing pet professionals who want to stand out and get more enquiries.",
    features: [
      "Everything in Starter, plus:",
      "Up to 5 service categories",
      "Featured higher in local search results",
      "15 photo gallery slots",
      "Add business description & specialties",
      "Social media & website links",
      '"Insured" & "Certified" badges',
      "Customer enquiry form",
      "Review response feature",
    ],
    cta: "Start Pro Plan",
    highlighted: true,
  },
  {
    name: "Premium Paw",
    emoji: "🏆",
    price: 39,
    description:
      "Maximum visibility and credibility for established businesses.",
    features: [
      "Everything in Pro, plus:",
      "Top placement in local search",
      '"Featured Provider" badge',
      "Unlimited photo gallery",
      "Video upload (show your space or services)",
      "Promotions & special offers section",
      "Direct booking link integration",
      "Priority customer support",
      "Highlighted listing in category pages",
    ],
    cta: "Upgrade to Premium",
  },
];

const addOns = [
  { name: "Additional Service Categories", price: 3, period: "month" },
  { name: "Extra Locations", price: 5, period: "month" },
  { name: "Homepage Spotlight Feature", price: 25, period: "month" },
  { name: "Social Media Spotlight Post", price: 15, period: "post" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-cyan-500 text-white py-16 lg:py-24">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg">
                Pricing for Pet Professionals
              </h1>
              <p className="text-lg lg:text-xl text-white/90 drop-shadow-md max-w-2xl mx-auto">
                At <strong>{PLATFORM_NAME}</strong>, we're here to help your pet
                business get discovered, build trust, and grow — without
                complicated contracts or hidden fees.
              </p>
            </div>
          </div>
        </section>

        {/* Intro Text */}
        <section className="py-12 lg:py-16 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg lg:text-xl text-gray-700 dark:text-gray-300">
                Whether you're just starting out or already fully booked, we have
                a plan that fits your stage.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
                {pricingTiers.map((tier, index) => (
                  <div
                    key={index}
                    className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                      tier.highlighted
                        ? "md:scale-105 shadow-2xl ring-2 ring-orange-500 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/20"
                        : "shadow-xl bg-white dark:bg-gray-800"
                    }`}
                  >
                    {tier.highlighted && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-center py-2 text-sm font-semibold">
                        MOST POPULAR
                      </div>
                    )}

                    <div
                      className={`p-8 ${tier.highlighted ? "pt-16" : ""}`}
                    >
                      {/* Header */}
                      <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-4xl">{tier.emoji}</span>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {tier.name}
                          </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          {tier.description}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="mb-8">
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-bold text-gray-900 dark:text-white">
                            £{tier.price}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            / month
                          </span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Link href="/signup/member">
                        <button
                          className={`w-full py-3 px-6 rounded-lg font-semibold mb-8 transition-all duration-300 ${
                            tier.highlighted
                              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {tier.cta}
                        </button>
                      </Link>

                      {/* Features */}
                      <div className="space-y-4">
                        {tier.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start gap-3">
                            <svg
                              className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Great For Section */}
        <section className="py-12 lg:py-16 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Starter Paw",
                  items: [
                    "New businesses",
                    "Side services",
                    "Simple online presence",
                  ],
                },
                {
                  title: "Pro Paw",
                  items: [
                    "Groomers & trainers",
                    "Walkers & sitters",
                    "Small teams ready to grow",
                  ],
                },
                {
                  title: "Premium Paw",
                  items: [
                    "Busy salons",
                    "Boarding facilities & clinics",
                    "Premium services",
                  ],
                },
              ].map((section, index) => (
                <div key={index} className="text-center">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Great for {section.title}:
                  </h4>
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Add-Ons Section */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  ✨ Add-On Options
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-cyan-500 mx-auto"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addOns.map((addon, index) => (
                  <div
                    key={index}
                    className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg dark:hover:bg-gray-800 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {addon.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          per {addon.period}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-500">
                          £{addon.price}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  No Long-Term Contracts
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  You can upgrade, downgrade, or cancel anytime. We believe in
                  earning your business every month.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="text-center">
                  <div className="text-4xl mb-4">✔️</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Reach Local Pet Owners
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Get discovered by pet parents actively searching for trusted services in your area.
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">✔️</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Build Trust with Reviews
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Earn badges, collect reviews, and showcase your expertise to stand out.
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">✔️</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Showcase Your Services
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Display your offerings, photos, and videos to attract the right customers.
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">✔️</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Stand Out from Competitors
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Featured placements and visibility features help you get more enquiries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-cyan-500 text-white py-16 lg:py-24">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white drop-shadow-lg">
                Ready to Grow Your Pet Business?
              </h2>
              <p className="text-lg lg:text-xl text-white/90 drop-shadow-md mb-8 max-w-2xl mx-auto">
                Join {PLATFORM_NAME} today and let pet parents find the care
                their pets deserve — with you. 🐾
              </p>
              <Link href="/signup/member">
                <button className="bg-white text-orange-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                  Get Started Today
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
