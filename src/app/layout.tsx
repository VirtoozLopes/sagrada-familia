import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sagrada Família Artigos Religiosos',
  description: 'Loja virtual de artigos religiosos e presentes sagrados.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="light">
      <body className={`${outfit.className} antialiased`}>
        {/* Grainy texture overlay for premium feel */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[9999] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        
        {/* Main background containers */}
        <div className="relative z-0 min-h-screen overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
