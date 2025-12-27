import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Play, Lightbulb, DollarSign, Users, TrendingUp, Home, Building2, Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">O</span>
                </div>
                <span className="ml-2 text-2xl font-semibold text-foreground">ORAN</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-foreground hover:text-primary transition-colors">Home</a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors">About</a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors">Services</a>
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-foreground mb-6">
                Transform Your Space Into A Smart Living Experience
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Experience the future of home automation with ORAN's AI-powered solutions. 
                Get instant quotes, flexible payments, and expert installation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto">Get Started</Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 h-96 flex items-center justify-center">
                <Home className="h-48 w-48 text-primary opacity-30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="bg-secondary py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Why Choose ORAN?</h2>
            <p className="text-xl text-muted-foreground">Everything you need for your smart home journey</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI-Powered Quotes</h3>
              <p className="text-muted-foreground">
                Get instant, accurate quotes powered by our intelligent pricing engine
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Flexible Payments</h3>
              <p className="text-muted-foreground">
                Choose from multiple payment plans that suit your budget
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Expert Installation</h3>
              <p className="text-muted-foreground">
                Certified technicians ensure professional and reliable installation
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Tracking</h3>
              <p className="text-muted-foreground">
                Monitor your project progress every step of the way
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Get started in just 4 simple steps</p>
          </div>

          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-primary/20 -translate-y-1/2 hidden lg:block" />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {[
                { step: 1, title: 'Create Project', description: 'Tell us about your space and automation needs' },
                { step: 2, title: 'Get Quote', description: 'Receive instant AI-generated quotes' },
                { step: 3, title: 'Choose Plan', description: 'Select your preferred payment method' },
                { step: 4, title: 'Install & Enjoy', description: 'Our experts handle the rest' }
              ].map((item) => (
                <div key={item.step} className="text-center relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4 relative z-10">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-secondary py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">What Our Clients Say</h2>
            <p className="text-xl text-muted-foreground">Join thousands of satisfied customers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'David Okafor', role: 'Homeowner', quote: 'ORAN transformed my home into a smart living space. The installation was seamless and the app makes controlling everything so easy!' },
              { name: 'Sarah Ahmed', role: 'Business Owner', quote: 'The flexible payment plans made it possible to automate our entire office. Best decision we made for our business.' },
              { name: 'Michael Chen', role: 'Property Developer', quote: 'Working with ORAN on multiple projects. Their professionalism and quality of work is unmatched.' }
            ].map((testimonial, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary font-semibold">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Ready to upgrade your space?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start your smart home journey today with ORAN
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Your Project
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">O</span>
                </div>
                <span className="ml-2 text-2xl font-semibold">ORAN</span>
              </div>
              <p className="text-gray-300">Smart Home Automation Platform</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Solutions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 ORAN Smart Home Automation. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
