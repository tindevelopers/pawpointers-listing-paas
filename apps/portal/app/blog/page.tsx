'use client';

import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { Metadata } from "next";
import { useState } from "react";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "PawPointers";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  date: string;
}

const categories = [
  "Dog Care",
  "Cat Care",
  "Pet Health",
  "Grooming Tips",
  "Training & Behaviour",
  "Nutrition",
  "Puppies & Kittens",
  "Senior Pets",
  "Pet Lifestyle",
  "Pet Safety",
  "Seasonal Advice",
];

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "How Often Should You Groom Your Dog?",
    excerpt: "A complete guide to grooming schedules based on breed, coat type, and lifestyle.",
    category: "Grooming Tips",
    readTime: "5 min read",
    image: "https://images.pexels.com/photos/8481760/pexels-photo-8481760.jpeg?w=400&h=250&fit=crop",
    date: "2 days ago",
  },
  {
    id: "2",
    title: "Signs Your Pet Might Need a Vet Visit",
    excerpt: "Learn the warning signs that indicate your furry friend needs professional veterinary care.",
    category: "Pet Health",
    readTime: "6 min read",
    image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=400&h=250&fit=crop",
    date: "5 days ago",
  },
  {
    id: "3",
    title: "Choosing the Right Food for Your Pet's Age",
    excerpt: "From puppies to seniors: nutritional needs change throughout your pet's life.",
    category: "Nutrition",
    readTime: "7 min read",
    image: "https://images.pexels.com/photos/2398220/pexels-photo-2398220.jpeg?w=400&h=250&fit=crop",
    date: "1 week ago",
  },
  {
    id: "4",
    title: "Reducing Anxiety in Dogs and Cats",
    excerpt: "Evidence-based techniques to help your anxious pet feel calm and safe.",
    category: "Training & Behaviour",
    readTime: "8 min read",
    image: "https://images.pexels.com/photos/1997320/pexels-photo-1997320.jpeg?w=400&h=250&fit=crop",
    date: "1 week ago",
  },
  {
    id: "5",
    title: "How to Prepare Your Pet for Boarding",
    excerpt: "Tips to make boarding stress-free for you and your pet.",
    category: "Pet Lifestyle",
    readTime: "5 min read",
    image: "https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?w=400&h=250&fit=crop",
    date: "2 weeks ago",
  },
  {
    id: "6",
    title: "Winter Pet Care: Keeping Your Pet Safe in Cold Weather",
    excerpt: "Essential tips for protecting your furry friend during the winter months.",
    category: "Seasonal Advice",
    readTime: "6 min read",
    image: "https://images.pexels.com/photos/1390555/pexels-photo-1390555.jpeg?w=400&h=250&fit=crop",
    date: "2 weeks ago",
  },
  {
    id: "7",
    title: "Kitten Care 101: First Week at Home",
    excerpt: "Everything you need to know to welcome a new kitten into your home.",
    category: "Puppies & Kittens",
    readTime: "7 min read",
    image: "https://images.pexels.com/photos/416458/pexels-photo-416458.jpeg?w=400&h=250&fit=crop",
    date: "3 weeks ago",
  },
  {
    id: "8",
    title: "Senior Pet Care: Quality of Life in the Golden Years",
    excerpt: "How to keep your aging companion comfortable, happy, and healthy.",
    category: "Senior Pets",
    readTime: "8 min read",
    image: "https://images.pexels.com/photos/3653137/pexels-photo-3653137.jpeg?w=400&h=250&fit=crop",
    date: "3 weeks ago",
  },
];

const popularTopics = [
  "How often should you groom your dog?",
  "Signs your pet might need a vet visit",
  "Choosing the right food for your pet's age",
  "Reducing anxiety in dogs and cats",
  "How to prepare your pet for boarding",
];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    setEmail("");
    alert("Thank you for subscribing!");
  };

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
              <h1 className="text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
                🐾 {PLATFORM_NAME} Blog
              </h1>
              <p className="text-xl lg:text-2xl text-white/90 drop-shadow-md font-semibold mb-6">
                Tips, advice, and stories for happy, healthy pets
              </p>
              <p className="text-lg text-white/80 drop-shadow-md max-w-2xl mx-auto">
                Welcome to the {PLATFORM_NAME} Blog — your go-to resource for expert pet care
                tips, training advice, health guidance, and heartwarming stories from the pet
                community.
              </p>
            </div>
          </div>
        </section>

        {/* Search & Filter Section */}
        <section className="py-12 lg:py-16 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  🔎 Find the right article
                </h2>
              </div>

              {/* Search Bar */}
              <div className="mb-8">
                <input
                  type="text"
                  placeholder="Search articles about grooming, training, health, nutrition, and more…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Category Filters */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Filter by category:
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedCategory === null
                        ? "bg-orange-500 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    All Articles
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        selectedCategory === category
                          ? "bg-orange-500 text-white"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Articles Section */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  📰 Latest Articles
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Stay up to date with the newest advice and insights from pet professionals.
                </p>
              </div>

              {filteredPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredPosts.map((post) => (
                    <article
                      key={post.id}
                      className="group rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 hover:translate-y-[-4px]"
                    >
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold px-3 py-1 rounded-full">
                            {post.category}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {post.readTime}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-orange-500 transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {post.date}
                          </span>
                          <a
                            href={`/blog/${post.id}`}
                            className="text-orange-500 hover:text-orange-600 font-semibold text-sm transition-colors"
                          >
                            Read More →
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    No articles found. Try adjusting your search or category filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Popular Topics Section */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  ⭐ Popular Topics
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Not sure where to start? These reader favorites are a great place to begin.
                </p>
              </div>

              <div className="space-y-4">
                {popularTopics.map((topic, index) => (
                  <a
                    key={index}
                    href="#"
                    className="block p-6 bg-white dark:bg-gray-700 rounded-xl hover:shadow-lg transition-all duration-300 hover:translate-x-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">📖</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-orange-500 transition-colors">
                          {topic}
                        </h3>
                      </div>
                      <span className="text-orange-500">→</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Expert Advice Section */}
        <section className="py-16 lg:py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                🐶 Expert Advice From Real Professionals
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Many of our articles are written in collaboration with groomers, trainers,
                vets, and pet care specialists listed on {PLATFORM_NAME}. That means
                you&apos;re getting practical advice from people who work hands-on with animals every
                day.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                We believe informed pet owners make happier pets — and we&apos;re here to help every
                step of the way.
              </p>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-orange-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-xl p-8 lg:p-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                  💌 Never Miss a Tip
                </h2>
                <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
                  Love pet advice? Join our newsletter and get helpful guides, seasonal tips,
                  and trusted recommendations delivered straight to your inbox.
                </p>

                <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Subscribe to Pet Tips
                  </button>
                </form>
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
                🐾 More Than a Blog
              </h2>
              <p className="text-lg lg:text-xl text-white/90 drop-shadow-md mb-8 max-w-2xl mx-auto">
                Looking for a service for your pet? {PLATFORM_NAME} doesn&apos;t just give advice
                — we help you find trusted professionals near you.
              </p>
              <Link href="/search">
                <button className="bg-white text-orange-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                  Find a Pet Professional Near You
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
