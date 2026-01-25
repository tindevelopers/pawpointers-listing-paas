"use client";

import Link from "next/link";
import Image from "next/image";

export default function WhyJoinPage() {
  const benefits = [
    {
      icon: "🐾",
      title: "Access Vetted Pet Care Professionals",
      description:
        "Connect with carefully screened and verified pet service providers who are passionate about animal care. All providers undergo background checks and are reviewed by our community.",
    },
    {
      icon: "📱",
      title: "Convenient & Easy Booking",
      description:
        "Book pet services in minutes with our intuitive platform. Schedule dog walkers, pet sitters, groomers, trainers, and more with just a few clicks.",
    },
    {
      icon: "⭐",
      title: "Trusted Reviews & Ratings",
      description:
        "Make informed decisions based on verified reviews from other pet owners. Our transparent rating system helps you find the perfect provider for your furry friend.",
    },
    {
      icon: "💼",
      title: "Professional Service Standards",
      description:
        "Our community maintains high standards of professionalism and care. Every service is backed by our commitment to your pet's safety and happiness.",
    },
    {
      icon: "🛡️",
      title: "Safe & Secure Platform",
      description:
        "Your pet's safety is our priority. Secure payments, verified providers, and transparent communication give you peace of mind.",
    },
    {
      icon: "👥",
      title: "Community of Pet Lovers",
      description:
        "Join a thriving community of pet owners and care professionals who share your passion for animal welfare and responsible pet ownership.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                Paw Pointers
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/listings"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Browse Services
              </Link>
              <Link
                href="/signup/member"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Become a Provider
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Why Join Paw Pointers?
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Your trusted guide to happy and healthy pets. Connect with the best pet care
                professionals in your community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/signup/user"
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-bold transition-colors inline-block text-center"
                >
                  Find Pet Services
                </Link>
                <Link
                  href="/signup/member"
                  className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-lg font-bold transition-colors inline-block text-center"
                >
                  Offer Your Services
                </Link>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-sm w-full">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2F5a52d82defcf479eb265bdbda490769e%2F04e4ae100f06472fa0e3df9d17b701a3?format=webp&width=800&height=1200"
                  alt="Paw Pointers - Your trusted guide to happy and healthy pets"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Benefits for Pet Owners
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-16 max-w-2xl mx-auto">
          Whether you need a dog walker, pet sitter, groomer, or trainer, Paw Pointers connects
          you with trusted professionals who care about your pets.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.slice(0, 3).map((benefit, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                {benefit.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {benefits.slice(3).map((benefit, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                {benefit.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provider Benefits Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
            Benefits for Service Providers
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-16 max-w-2xl mx-auto">
            Grow your pet care business with access to a community of pet owners who are ready to
            book your services.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                Grow Your Business
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Reach thousands of pet owners in your area</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Flexible scheduling and booking management</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Build your reputation with verified reviews</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Secure payment processing</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                Dedicated Support
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>24/7 customer support</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Business tools and analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Marketing support to grow your profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl mt-1">✓</span>
                  <span>Community of fellow pet care professionals</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of pet owners and care professionals on Paw Pointers today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/user"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-bold transition-colors inline-block"
            >
              Sign Up as Pet Owner
            </Link>
            <Link
              href="/signup/member"
              className="bg-blue-500 hover:bg-blue-400 px-8 py-3 rounded-lg font-bold transition-colors inline-block"
            >
              Sign Up as Provider
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">About Paw Pointers</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/why-join" className="hover:text-white transition-colors">
                    Why Join
                  </Link>
                </li>
                <li>
                  <Link href="/listings" className="hover:text-white transition-colors">
                    Find Services
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">For Providers</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/signup/member" className="hover:text-white transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/knowledge-base" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p>
              &copy; 2024 Paw Pointers. Your trusted guide to happy and healthy pets.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
