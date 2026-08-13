import AnalysisCount from '../saju/AnalysisCount'
import Mascot from '../Mascot'

export default function Hero({ refreshKey }) {
  return (
    <section className="hero">
      <Mascot size="lg" decorative={false} />
      <h1 className="hero-title">사주미</h1>
      <p className="hero-sub">달토끼 미가 출생 정보로 성격과 기질을 읽어 드립니다.</p>
      <AnalysisCount refreshKey={refreshKey} />
    </section>
  )
}
