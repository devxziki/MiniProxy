export const metadata = {
  title: 'MiniProxy',
  description: 'Lightweight AI proxy for free providers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
