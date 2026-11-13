import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Stats from "./components/landing/Stats";
import Features from "./components/landing/Features";
import Modules from "./components/landing/Modules";
import Quote from "./components/landing/Quote";
import Pricing from "./components/landing/Pricing";
import Faq from "./components/landing/Faq";
import Cta from "./components/landing/Cta";
import Footer from "./components/landing/Footer";

// The public home page. Shown when the visitor is not signed in (see page.js).
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F6F3EA] font-sans text-[#132622] antialiased">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Modules />
        <Quote />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
