import Link from "next/link";
import Image from "next/image";
import { Header, Footer } from "@/components/layout";
import { Metadata } from "next";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Paw Pointers";

export const metadata: Metadata = {
  title: `About ${PLATFORM_NAME} - Connecting Pets and Professionals`,
  description: `Learn about ${PLATFORM_NAME}'s mission to connect pet owners with trusted professionals. Discover our story, values, and vision for the pet care community.`,
};

export default function AboutPage() {
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
                About {PLATFORM_NAME}
              </h1>
              <p className="text-lg lg:text-xl text-white/90 drop-shadow-md max-w-2xl mx-auto">
                Where pets and people connect. Building a community that celebrates the bond between pets and the professionals who care for them.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Values Section */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Main Mission */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                    Our Mission
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-cyan-500 mx-auto mb-6"></div>
                </div>

                <p className="text-xl text-gray-700 dark:text-gray-300 text-center max-w-3xl mx-auto mb-4 font-semibold">
                  To connect pet owners with trusted pet professionals — all in one place.
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-400 text-center max-w-3xl mx-auto">
                  From groomers and trainers to vets, sitters, photographers, and specialty service providers, {PLATFORM_NAME} brings the entire pet care ecosystem together in a single, easy-to-use platform.
                </p>
              </div>

              {/* Story Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                    At {PLATFORM_NAME}, We Believe
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Pets aren&apos;t just animals — they&apos;re family. And just like any family member, they deserve the very best care, support, and services.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    {PLATFORM_NAME} was created to make life easier for pet owners and more visible for the incredible professionals who dedicate their lives to animal wellbeing.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    We&apos;re building a trusted space where loving pet parents can quickly find reliable, high-quality services — and where passionate pet businesses can grow and connect with the community they serve.
                  </p>
                </div>
                <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.pexels.com/photos/46024/pexels-photo-46024.jpeg"
                    alt="A heartwarming moment of a cat cuddling a dog on green grass outdoors"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why We Started Section */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl order-last lg:order-first">
                  <Image
                    src="https://images.pexels.com/photos/10923971/pexels-photo-10923971.jpeg"
                    alt="A senior woman enjoying a day by the water with her service dog"
                    fill
                    className="object-cover"
                  />
                </div>

                <div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                    Why We Started {PLATFORM_NAME}
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    <strong>We saw a gap.</strong>
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Pet owners often struggle to find reliable services, especially when they move to a new area or need something specific. At the same time, many fantastic pet professionals rely only on social media or local advertising, making them hard to find outside their immediate network.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {PLATFORM_NAME} was born to bridge that gap — creating a dedicated directory built <em>specifically</em> for the pet industry. Not a general listing site. Not a cluttered marketplace. But a focused, pet-centric platform designed with care, clarity, and community in mind.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  What Makes {PLATFORM_NAME} Different
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-cyan-500 mx-auto"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-8">
                  <div className="text-4xl mb-4">🐾</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Pet-Focused Only
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We are 100% dedicated to the pet world. Every listing, category, and feature is built around the needs of pets and their humans.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-2xl p-8">
                  <div className="text-4xl mb-4">🤝</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Trust & Transparency
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We encourage complete profiles, clear service descriptions, and real reviews to help pet owners make informed decisions.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-8">
                  <div className="text-4xl mb-4">🌍</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Local & Discoverable
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {PLATFORM_NAME} helps pet owners discover amazing services right in their area — from everyday essentials to specialist care.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-8">
                  <div className="text-4xl mb-4">💼</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Supporting Small Businesses
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We champion independent groomers, trainers, walkers, sitters, and boutique pet businesses, giving them a professional space to be seen and grow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Pet Owners */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                    For Pet Owners
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-cyan-500 mb-6"></div>

                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Whether you&apos;re looking for a gentle groomer, a reliable dog walker, a skilled trainer, or a specialist therapist, {PLATFORM_NAME} helps you find the right person for your pet&apos;s unique needs.
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    We&apos;re here to make pet care simpler, safer, and more accessible — so you can spend less time searching and more time enjoying life with your furry (or feathered, or scaled!) companion.
                  </p>

                  <Link
                    href="/"
                    className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Find a Service Provider
                  </Link>
                </div>
                <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.pexels.com/photos/6235021/pexels-photo-6235021.jpeg"
                    alt="A veterinarian gently holds a dog&apos;s paw during a medical check-up"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Pet Professionals */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.pexels.com/photos/6816837/pexels-photo-6816837.jpeg"
                    alt="A groomer trims a small dog&apos;s fur at a modern pet salon"
                    fill
                    className="object-cover"
                  />
                </div>

                <div>
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                    For Pet Professionals
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-cyan-500 mb-6"></div>

                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    If you work in the pet industry, {PLATFORM_NAME} is your platform to shine. We give you the tools to:
                  </p>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <span className="text-orange-500 font-bold text-xl">✓</span>
                      <span className="text-gray-600 dark:text-gray-400 text-lg">Showcase your services</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-orange-500 font-bold text-xl">✓</span>
                      <span className="text-gray-600 dark:text-gray-400 text-lg">Share your expertise</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-orange-500 font-bold text-xl">✓</span>
                      <span className="text-gray-600 dark:text-gray-400 text-lg">Reach new local clients</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-orange-500 font-bold text-xl">✓</span>
                      <span className="text-gray-600 dark:text-gray-400 text-lg">Build credibility and trust</span>
                    </li>
                  </ul>

                  <p className="text-gray-600 dark:text-gray-400 mb-6 italic">
                    When pet professionals thrive, pets receive better care — and that&apos;s a win for everyone.
                  </p>

                  <Link
                    href="/signup/member"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Become a Service Provider
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-orange-500 via-orange-400 to-cyan-500 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 drop-shadow-lg">
                Our Vision
              </h2>
              <p className="text-lg lg:text-xl text-white/95 drop-shadow-md mb-6">
                We envision a world where every pet owner can easily access trusted care, and every dedicated pet professional gets the recognition they deserve.
              </p>
              <p className="text-lg lg:text-xl text-white/95 drop-shadow-md">
                {PLATFORM_NAME} isn&apos;t just a directory — it&apos;s a growing community built on love for animals, respect for professionals, and a shared goal of better lives for pets everywhere.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Join the {PLATFORM_NAME} Community
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
                Whether you&apos;re a pet owner looking for trusted services or a professional ready to grow your business, we&apos;re here for you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Browse Services
                </Link>
                <Link
                  href="/signup/member"
                  className="inline-block border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  List Your Services
                </Link>
              </div>

              <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  <span className="text-4xl">🐾</span>
                </p>
                <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold mt-4">
                  Welcome to {PLATFORM_NAME}.
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Where pets and people connect.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
