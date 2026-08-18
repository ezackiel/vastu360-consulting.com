import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Approach from "./components/Approach.jsx";
import Process from "./components/Process.jsx";
import Services from "./components/Services.jsx";
import { ReportSection, Ethics, Contact, Footer, AboutUs } from "./components/Static.jsx";
import Trust from "./components/Trust.jsx";
import Booking from "./components/Booking.jsx";
import Account from "./components/Account.jsx";
import WhatsAppButton from "./components/WhatsAppButton.jsx";
import PublicChatWidget from "./components/PublicChatWidget.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const returnOrderId = params.get("orderId");

  return (
    <>
      <Nav />
      <Hero />
      <Approach />
      <Process />
      <Services />
      <ReportSection />
      <Ethics />
      <AboutUs />
      <Trust />
      <Booking returnOrderId={returnOrderId} />
      <Account />
      <Contact />
      <Footer />
      <WhatsAppButton />
      <PublicChatWidget />
    </>
  );
}
