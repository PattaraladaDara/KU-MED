import { AppShell } from "@/components/app-shell";
import { DesignImage } from "@/components/design-image";
import { availableAssets } from "@/lib/design-assets";

export default function Home() {
  const assets = availableAssets();
  return (
    <AppShell assets={assets}>
      <div className="home-card" data-node-id="1:57">
        <article className="welcome-panel" data-node-id="126:1199">
          <h1>ยินดีต้อนรับเข้าสู่ระบบบริหารจัดการสถานพยาบาล</h1>
          <p className="university">มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p>
          <p className="introduction">
            มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน เป็นวิทยาเขตแห่งหนึ่งที่มีการเรียนการสอนของ
            <a href="https://th.wikipedia.org/wiki/มหาวิทยาลัยเกษตรศาสตร์" target="_blank" rel="noreferrer">มหาวิทยาลัยเกษตรศาสตร์</a>
            {" ที่มุ่งเน้นให้การศึกษา สร้างสรรค์และพัฒนาความรู้ ให้บริการทางวิชาการ รวมทั้งสืบสานและอนุรักษ์ศิลปวัฒนธรรมที่สอดคล้องกับนโยบายการศึกษา การพัฒนาเศรษฐกิจ และสังคมของประเทศ โดยเฉพาะการพัฒนาและเพิ่มประสิทธิภาพการผลิตทางด้านเกษตร"}
          </p>
          <div className="hospital-banner" data-node-id="128:1203"><DesignImage name="banner" assets={assets} alt="ประกาศของสถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์" /></div>
          <section className="hospital-information" aria-labelledby="hospital-title">
            <div className="hospital-heading"><h2 id="hospital-title">สถานพยาบาล</h2><p className="university">มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p></div>
            <p className="location-label">ข้อมูล/ตำแหน่งที่ตั้ง</p>
            <p className="location-description">ตั้งอยู่ที่เลขที่ 1 หมู่ 6 ตำบลกำแพงแสน อำเภอกำแพงแสน จังหวัดนครปฐม 73140 ให้บริการตรวจรักษาพยาบาลเบื้องต้นแก่บุคลากร นิสิต และประชาชนทั่วไป</p>
          </section>
          <section className="news" id="news" aria-labelledby="news-title">
            <h2 id="news-title">ข้อมูลข่าวสาร</h2>
            <article className="news-card" data-node-id="128:1208"><h3>ปิดให้บริการในวันศุกร์ที่ 25 กันยายน 2569 ระหว่างเวลา 12.00 – 16.30 น.</h3><p>เพื่อประชุมบุคลากรในโครงการพัฒนาคุณภาพสถานพยาบาล (Hospital Accreditation; HA) เปิดให้บริการตามปกติอีกครั้งหลังเวลา 16.30 น. เป็นต้นไป</p></article>
            <article className="news-card news-with-image" data-node-id="128:1215">
              <div className="news-poster" data-node-id="128:1218"><DesignImage name="poster" assets={assets} alt="ประกาศปิดทำการชั่วคราว วันที่ 28 สิงหาคม 2569" /></div>
              <div><h3>สถานพยาบาล ปิดบริการ 28 สค 69 08.30-16.30<br />ฝึกซ้อมดับเพลิง-อพยพหนีไฟ ประจำปี และประชุม HA</h3><p>เพื่อประชุมบุคลากรในโครงการพัฒนาคุณภาพสถานพยาบาล (Hospital Accreditation; HA) เปิดให้บริการตามปกติอีกครั้งหลังเวลา 16.30 น. เป็นต้นไป</p></div>
            </article>
          </section>
          <footer className="site-footer"><span>สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</span><span>• โทรสายด่วนฉุกเฉิน 02-xxx-xxxx</span></footer>
        </article>
      </div>
    </AppShell>
  );
}
