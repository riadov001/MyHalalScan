import { motion } from 'framer-motion';
import { Search, ShieldCheck, Database, Sliders, History, Smartphone, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { PhoneMockup } from '../components/PhoneMockup';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#060D09] text-[#EEF4F0] font-sans selection:bg-[#C8963C] selection:text-[#060D09]">
      <Navbar />
      <Hero />
      <Verdicts />
      <Features />
      <DatabaseSection />
      <Trust />
      <CTA />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-[#060D09]/90 border-b border-[#192C20]">
      <div className="flex items-center gap-3">
        <img 
          src={import.meta.env.BASE_URL + "icon.png"} 
          alt="HalalScan Logo" 
          className="w-9 h-9 rounded-xl shadow-lg shadow-[#C8963C]/10" 
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#1AAF5A]">Halal</span>
          <span className="text-[#C8963C]">Scan</span>
        </span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9AB5A5]">
        <a href="#features" className="hover:text-[#C8963C] transition-colors">Fonctionnalités</a>
        <a href="#verdicts" className="hover:text-[#C8963C] transition-colors">Verdicts</a>
        <a href="#database" className="hover:text-[#C8963C] transition-colors">Base de données</a>
      </div>
      <a href="#download" className="px-5 py-2 rounded-full bg-gradient-to-r from-[#C8963C] to-[#DFB870] text-[#060D09] font-bold text-sm hover:scale-105 transition-transform shadow-[0_0_15px_rgba(200,150,60,0.2)]">
        Télécharger
      </a>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C8963C]/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24 relative z-10">
        <div className="flex-1 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C8963C]/30 bg-[#C8963C]/10 text-[#DFB870] text-xs font-semibold uppercase tracking-wider mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8963C] animate-pulse" />
            حلال · Vérification alimentaire
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-[5rem] font-bold tracking-tighter leading-[1.05] mb-6"
          >
            Un scan.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8963C] via-[#DFB870] to-[#C8963C]">Une certitude.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-[#9AB5A5] max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light"
          >
            Pointez votre caméra. Obtenez un verdict immédiat. Comme avoir un savant en poche, avec une précision absolue sur chaque ingrédient et E-code.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <a href="#download" className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#EEF4F0] text-[#060D09] font-bold text-lg hover:bg-[#C8963C] transition-colors flex items-center justify-center gap-2">
              <Smartphone className="w-5 h-5" />
              Obtenir l'application
            </a>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-full bg-transparent border border-[#192C20] text-[#EEF4F0] font-semibold text-lg hover:bg-[#0C1912] transition-colors flex items-center justify-center gap-2">
              Découvrir
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: 'spring', damping: 20 }}
          className="flex-1 flex justify-center relative w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1AAF5A]/20 to-[#C8963C]/20 blur-[80px] rounded-full max-w-md mx-auto" />
          <PhoneMockup status="scan" />
          
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="absolute -right-4 md:-right-12 top-1/3 bg-[#0C1912]/80 backdrop-blur-xl border border-[#192C20] p-4 rounded-2xl shadow-xl shadow-black/50 hidden sm:block"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1AAF5A]/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#1AAF5A]" />
              </div>
              <div>
                <div className="font-bold text-sm text-[#EEF4F0]">Analyse E-codes</div>
                <div className="text-xs text-[#9AB5A5]">En temps réel</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Verdicts() {
  const verdicts = [
    {
      title: "Halal",
      desc: "Tous les ingrédients sont licites. Consommez sereinement.",
      color: "#1AAF5A",
      bg: "bg-[#1AAF5A]/10",
      border: "border-[#1AAF5A]/20",
      icon: CheckCircle
    },
    {
      title: "À Vérifier",
      desc: "Composants douteux ou multi-sources. Plus d'infos nécessaires.",
      color: "#E8921A",
      bg: "bg-[#E8921A]/10",
      border: "border-[#E8921A]/20",
      icon: AlertTriangle
    },
    {
      title: "Non Halal",
      desc: "Présence confirmée d'ingrédients illicites (porc, alcool...).",
      color: "#DC3545",
      bg: "bg-[#DC3545]/10",
      border: "border-[#DC3545]/20",
      icon: XCircle
    }
  ];

  return (
    <section id="verdicts" className="py-32 bg-[#0C1912] border-y border-[#192C20]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Un verdict sans ambiguïté</h2>
          <p className="text-[#9AB5A5] text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Trois couleurs. Zéro doute. Nous analysons chaque ligne de la composition pour vous donner un résultat clair, immédiat et étayé.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {verdicts.map((v, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className={`p-10 rounded-3xl bg-[#060D09] border ${v.border} hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${v.bg} blur-[50px] rounded-full group-hover:scale-150 transition-transform duration-500`} />
              <div className={`w-16 h-16 rounded-2xl ${v.bg} flex items-center justify-center mb-8 relative z-10`}>
                <v.icon className="w-8 h-8" style={{ color: v.color }} />
              </div>
              <h3 className="text-2xl font-bold mb-3 relative z-10" style={{ color: v.color }}>{v.title}</h3>
              <p className="text-[#9AB5A5] leading-relaxed relative z-10">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Search,
      title: "Scan instantané",
      desc: "Pointez la caméra, obtenez un verdict en quelques secondes grâce à notre moteur de reconnaissance OCR ultra-rapide."
    },
    {
      icon: ShieldCheck,
      title: "Analyse exhaustive",
      desc: "Chaque ingrédient, E-code, additif, colorant et émulsifiant est croisé avec la jurisprudence islamique."
    },
    {
      icon: Database,
      title: "Base massive",
      desc: "Des millions de produits indexés via OpenFoodFacts et notre propre base interne, mise à jour quotidiennement."
    },
    {
      icon: Sliders,
      title: "Règles personnalisées",
      desc: "Adaptez l'app à votre école juridique. Ajoutez vos propres ingrédients toujours illicites ou toujours licites."
    },
    {
      icon: History,
      title: "Mode Hors-ligne",
      desc: "Dans un supermarché sans réseau ? Pas de problème. Vos historiques et bases essentielles sont sauvegardés localement."
    },
    {
      icon: Smartphone,
      title: "Design premium",
      desc: "Une interface sombre, élégante et sans distraction, pensée pour être lisible dans toutes les conditions d'éclairage."
    }
  ];

  return (
    <section id="features" className="py-32 relative">
      <div className="absolute top-40 right-0 w-[600px] h-[600px] bg-[#C8963C]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/3">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Précision chirurgicale.</h2>
            <p className="text-[#9AB5A5] text-lg mb-12 font-light leading-relaxed">
              HalalScan ne se contente pas de chercher le mot "porc". Nous analysons les additifs cachés, les gélatines, et les origines des émulsifiants pour garantir votre tranquillité d'esprit.
            </p>
            <div className="hidden lg:block relative w-full h-[550px]">
              <div className="absolute top-0 left-0 transform -rotate-6">
                <PhoneMockup status="haram" />
              </div>
            </div>
          </div>
          
          <div className="lg:w-2/3 grid sm:grid-cols-2 gap-x-8 gap-y-12">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col gap-4 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#0C1912] border border-[#192C20] flex items-center justify-center text-[#C8963C] group-hover:bg-[#C8963C]/10 group-hover:border-[#C8963C]/30 transition-all">
                  <f.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-[#EEF4F0] tracking-tight">{f.title}</h4>
                <p className="text-[#9AB5A5] leading-relaxed font-light text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DatabaseSection() {
  return (
    <section id="database" className="py-32 bg-[#0C1912] border-y border-[#192C20] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1AAF5A]/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 z-10 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1AAF5A]/30 bg-[#1AAF5A]/10 text-[#1AAF5A] text-xs font-semibold uppercase tracking-wider">
              <Database className="w-4 h-4" /> Base de données mondiale
            </div>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              Des millions de produits à portée de main.
            </h2>
            <p className="text-[#9AB5A5] text-lg font-light leading-relaxed">
              Alimenté par la puissance d'OpenFoodFacts et vérifié par nos algorithmes propriétaires. Que vous soyez en France, au Maroc ou au Japon, HalalScan décrypte les étiquettes complexes pour vous.
            </p>
            <ul className="space-y-5 pt-4">
              {[
                "Base OpenFoodFacts mondiale intégrée", 
                "Détection intelligente des E-codes douteux", 
                "Mises à jour quotidiennes de la base interne"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-[#EEF4F0] font-medium">
                  <div className="w-6 h-6 rounded-full bg-[#1AAF5A]/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-[#1AAF5A]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex-1 relative z-10 w-full order-1 lg:order-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-[#060D09] p-5 rounded-3xl border border-[#192C20] flex items-center gap-4 shadow-lg shadow-black/20"
                >
                  <div className="w-14 h-14 bg-[#0C1912] rounded-2xl flex items-center justify-center text-3xl border border-[#192C20]">🍫</div>
                  <div>
                    <div className="font-bold text-[#EEF4F0]">Barre Chocolatée</div>
                    <div className="text-xs font-semibold text-[#1AAF5A] mt-1">HALAL</div>
                  </div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-[#060D09] p-5 rounded-3xl border border-[#192C20] flex items-center gap-4 shadow-lg shadow-black/20"
                >
                  <div className="w-14 h-14 bg-[#0C1912] rounded-2xl flex items-center justify-center text-3xl border border-[#192C20]">🍬</div>
                  <div>
                    <div className="font-bold text-[#EEF4F0]">Bonbons Gélifiés</div>
                    <div className="text-xs font-semibold text-[#DC3545] mt-1">NON HALAL (E441)</div>
                  </div>
                </motion.div>
              </div>
              <div className="space-y-4">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-[#060D09] p-5 rounded-3xl border border-[#192C20] flex items-center gap-4 shadow-lg shadow-black/20"
                >
                  <div className="w-14 h-14 bg-[#0C1912] rounded-2xl flex items-center justify-center text-3xl border border-[#192C20]">🍜</div>
                  <div>
                    <div className="font-bold text-[#EEF4F0]">Nouilles Instantanées</div>
                    <div className="text-xs font-semibold text-[#E8921A] mt-1">À VÉRIFIER</div>
                  </div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-[#060D09] p-5 rounded-3xl border border-[#C8963C]/40 shadow-[0_0_30px_rgba(200,150,60,0.15)] flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#C8963C]/10 to-transparent" />
                  <div className="w-14 h-14 bg-[#C8963C]/20 rounded-2xl flex items-center justify-center text-[#C8963C] relative z-10">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="relative z-10">
                    <div className="font-bold text-[#EEF4F0]">2.5M+ Produits</div>
                    <div className="text-xs text-[#9AB5A5] mt-1">Scannez pour voir</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center z-10 relative">
        <ShieldCheck className="w-20 h-20 text-[#C8963C] mx-auto mb-10 opacity-90" />
        <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-[1.1] tracking-tight">
          La confiance n'est pas une option. <br className="hidden md:block"/>C'est notre fondation.
        </h2>
        <p className="text-xl text-[#9AB5A5] mb-14 font-light leading-relaxed">
          Développé par <span className="text-[#DFB870] font-semibold">Straight Path Intelligence</span>. 
          Nous combinons la rigueur technologique à l'éthique islamique pour vous offrir un outil sur lequel vous pouvez compter chaque jour.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6 md:gap-12 text-[#9AB5A5] font-medium">
          <div className="flex items-center justify-center gap-3 bg-[#0C1912] py-3 px-6 rounded-full border border-[#192C20]">
            <CheckCircle className="w-5 h-5 text-[#1AAF5A]" /> Pas de revente de données
          </div>
          <div className="flex items-center justify-center gap-3 bg-[#0C1912] py-3 px-6 rounded-full border border-[#192C20]">
            <CheckCircle className="w-5 h-5 text-[#1AAF5A]" /> Transparence totale
          </div>
          <div className="flex items-center justify-center gap-3 bg-[#0C1912] py-3 px-6 rounded-full border border-[#192C20]">
            <CheckCircle className="w-5 h-5 text-[#1AAF5A]" /> Indépendance absolue
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="download" className="py-24 px-6 relative z-20">
      <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#0C1912] to-[#060D09] border border-[#C8963C]/20 rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-black/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C8963C]/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#EEF4F0] to-[#DFB870]">
            Votre alimentation, <br />
            votre éthique.
          </h2>
          <p className="text-lg md:text-xl text-[#9AB5A5] mb-12 max-w-2xl mx-auto font-light">
            Rejoignez ceux qui ont fait le choix de la certitude. Téléchargez HalalScan dès aujourd'hui et scannez votre premier produit.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="flex items-center justify-center gap-4 px-8 py-4 bg-[#EEF4F0] text-[#060D09] rounded-2xl font-bold text-lg hover:bg-[#C8963C] transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.7.04 2.94.8 3.75 2.01-3.24 1.83-2.69 6.2.37 7.52-.77 1.8-1.74 3.48-2.79 4.4zm-4.71-13.6c-.32-1.85 1.17-3.66 3.01-4.01.37 2.01-1.39 3.8-3.01 4.01z" />
              </svg>
              <div className="text-left">
                <div className="text-xs font-semibold opacity-80 mb-0.5">Télécharger dans</div>
                <div className="leading-none text-xl tracking-tight">l'App Store</div>
              </div>
            </button>
            <button className="flex items-center justify-center gap-4 px-8 py-4 bg-[#0C1912] border-2 border-[#192C20] text-[#EEF4F0] rounded-2xl font-bold text-lg hover:border-[#C8963C]/50 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 21.75V2.25l18 9.75-18 9.75z" fill="currentColor" className="text-[#EEF4F0]" />
              </svg>
              <div className="text-left">
                <div className="text-xs font-semibold text-[#9AB5A5] mb-0.5 uppercase tracking-wider">Disponible sur</div>
                <div className="leading-none text-xl tracking-tight">Google Play</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0C1912] border-t border-[#192C20] py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-4">
          <img 
            src={import.meta.env.BASE_URL + "icon.png"} 
            alt="HalalScan Logo" 
            className="w-12 h-12 rounded-xl border border-[#192C20]" 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <div className="font-bold text-xl tracking-tight">
              <span className="text-[#1AAF5A]">Halal</span>
              <span className="text-[#C8963C]">Scan</span>
            </div>
            <div className="text-[#567060] text-sm mt-0.5 font-medium">v1.2.07</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right">
          <div className="text-[#9AB5A5] text-sm font-medium">Conçu et développé par</div>
          <div className="flex items-center gap-3 bg-[#060D09] px-4 py-2 rounded-full border border-[#192C20]">
            <img 
              src={import.meta.env.BASE_URL + "spi-logo.png"} 
              alt="SPI Logo" 
              className="h-6 w-auto object-contain brightness-0 invert opacity-80" 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
            />
            <a href="https://www.straight-path.eu" target="_blank" rel="noreferrer" className="text-[#DFB870] font-bold text-sm hover:text-[#C8963C] transition-colors">
              Straight Path Intelligence
            </a>
          </div>
          <div className="text-[#567060] text-xs mt-2 font-medium">
            © {new Date().getFullYear()} Tous droits réservés.
          </div>
        </div>
      </div>
    </footer>
  );
}
