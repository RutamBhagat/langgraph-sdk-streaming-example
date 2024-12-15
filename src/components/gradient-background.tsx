export function GradientBackground() {
  return (
    <>
      <div className="fixed inset-0 bg-[#0D001A]" />
      <div className="fixed inset-0 bg-gradient-to-tr from-purple-500/30 via-transparent to-pink-500/30 opacity-50" />
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
      </div>
      <div className="fixed left-1/2 top-0 -translate-x-1/2">
        <div className="h-[500px] w-[800px] bg-purple-500/30 blur-[100px]" />
      </div>
    </>
  );
}