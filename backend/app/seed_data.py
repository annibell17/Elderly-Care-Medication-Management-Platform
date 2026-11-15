import logging
from datetime import datetime, timezone, timedelta, time
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, ElderlyProfile, CareNetwork, Permission, Invitation
from app.models.medication import Medication, MedicationSchedule, ScheduledDose, AdherenceEvent
from app.models.appointment import Doctor, Appointment
from app.models.care import CaregiverLog, HealthObservation, EscalationEvent
from app.models.notification import Notification

logger = logging.getLogger(__name__)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_user = db.query(User).filter(User.email == "margaret.sharma@carecircle.demo").first()
        if existing_user:
            logger.info("Database already seeded.")
            return

        logger.info("Seeding CareCircle database with rich realistic data...")

        # 1. USERS
        elderly_user = User(
            email="margaret.sharma@carecircle.demo",
            full_name="Margaret Sharma",
            hashed_password=get_password_hash("password123"),
            role="elderly",
            phone_number="+1-555-0101",
            language_pref="en"
        )
        caretaker_user = User(
            email="anita.devi@carecircle.demo",
            full_name="Anita Devi",
            hashed_password=get_password_hash("password123"),
            role="caretaker",
            phone_number="+1-555-0102",
            language_pref="en"
        )
        family_user = User(
            email="rohan.sharma@carecircle.demo",
            full_name="Rohan Sharma",
            hashed_password=get_password_hash("password123"),
            role="family_member",
            phone_number="+1-555-0103",
            language_pref="en"
        )

        db.add_all([elderly_user, caretaker_user, family_user])
        db.commit()
        db.refresh(elderly_user)
        db.refresh(caretaker_user)
        db.refresh(family_user)

        # 2. ELDERLY PROFILE
        profile = ElderlyProfile(
            user_id=elderly_user.id,
            date_of_birth="1954-04-12",
            blood_type="B+",
            primary_language="English",
            emergency_contact_name="Rohan Sharma",
            emergency_contact_phone="+1-555-0103",
            emergency_contact_relation="Son",
            allergies=["Penicillin", "Sulfa antibiotics"],
            chronic_conditions=["Type 2 Diabetes", "Hypertension", "Mild Osteoarthritis"],
            notes="Prefers morning medications right after breakfast with lukewarm water. Uses reading glasses for labels."
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        # 3. CARE NETWORK & PERMISSIONS
        # Caretaker Anita
        caretaker_net = CareNetwork(
            elderly_profile_id=profile.id,
            user_id=caretaker_user.id,
            role="caretaker",
            relationship_label="Primary Visiting Caregiver",
            is_primary=True,
            status="active"
        )
        db.add(caretaker_net)
        db.commit()
        db.refresh(caretaker_net)

        perm_caretaker = Permission(
            care_network_id=caretaker_net.id,
            can_view_medications=True,
            can_confirm_medications=True,
            can_manage_schedules=True,
            can_view_appointments=True,
            can_schedule_appointments=True,
            can_view_health_records=True,
            can_view_analytics=True,
            can_receive_escalations=True,
            can_write_handover_logs=True
        )
        db.add(perm_caretaker)

        # Family Member Rohan
        family_net = CareNetwork(
            elderly_profile_id=profile.id,
            user_id=family_user.id,
            role="family_member",
            relationship_label="Son & Healthcare Proxy",
            is_primary=False,
            status="active"
        )
        db.add(family_net)
        db.commit()
        db.refresh(family_net)

        perm_family = Permission(
            care_network_id=family_net.id,
            can_view_medications=True,
            can_confirm_medications=False,
            can_manage_schedules=False,
            can_view_appointments=True,
            can_schedule_appointments=True,
            can_view_health_records=True,
            can_view_analytics=True,
            can_receive_escalations=True,
            can_write_handover_logs=False
        )
        db.add(perm_family)
        db.commit()

        # 4. DOCTORS
        doc_sarah = Doctor(
            elderly_profile_id=profile.id,
            name="Dr. Sarah Jenkins, MD",
            specialization="Geriatric Medicine",
            clinic_hospital="Metropolitan Senior Health Center",
            phone="+1-555-0211",
            email="dr.jenkins@metrohealth.demo",
            address="Suite 400, 1200 Healthcare Blvd",
            notes="Primary geriatrician. Monitors diabetes management and routine quarterly reviews."
        )
        doc_vikram = Doctor(
            elderly_profile_id=profile.id,
            name="Dr. Vikram Patel, MD",
            specialization="Cardiology",
            clinic_hospital="Heart & Vascular Specialists",
            phone="+1-555-0212",
            email="dr.patel@cardio.demo",
            address="Floor 3, 45 Medical Plaza",
            notes="Manages blood pressure and lipid panel maintenance."
        )
        db.add_all([doc_sarah, doc_vikram])
        db.commit()
        db.refresh(doc_sarah)
        db.refresh(doc_vikram)

        # 5. MEDICATIONS
        med1 = Medication(
            elderly_profile_id=profile.id,
            name="Metformin",
            generic_name="Metformin Hydrochloride",
            dosage_strength="500mg",
            form="tablet",
            color_code="#0D9488",
            purpose="Type 2 Diabetes - Glycemic control",
            instructions="Take 1 tablet twice daily with meals (breakfast & dinner). Avoid empty stomach.",
            quantity_remaining=32,
            refill_threshold=7,
            total_prescribed=60,
            prescribing_doctor_id=doc_sarah.id
        )
        med2 = Medication(
            elderly_profile_id=profile.id,
            name="Amlodipine",
            generic_name="Amlodipine Besylate",
            dosage_strength="5mg",
            form="tablet",
            color_code="#0284C7",
            purpose="Hypertension - Blood pressure regulation",
            instructions="Take 1 tablet every morning with water.",
            quantity_remaining=24,
            refill_threshold=6,
            total_prescribed=30,
            prescribing_doctor_id=doc_vikram.id
        )
        med3 = Medication(
            elderly_profile_id=profile.id,
            name="Atorvastatin",
            generic_name="Atorvastatin Calcium",
            dosage_strength="20mg",
            form="tablet",
            color_code="#7C3AED",
            purpose="Cholesterol reduction & cardiovascular prevention",
            instructions="Take 1 tablet daily at bedtime.",
            quantity_remaining=28,
            refill_threshold=7,
            total_prescribed=30,
            prescribing_doctor_id=doc_vikram.id
        )
        med4 = Medication(
            elderly_profile_id=profile.id,
            name="Aspirin Low-Dose",
            generic_name="Acetylsalicylic Acid",
            dosage_strength="81mg",
            form="tablet",
            color_code="#D97706",
            purpose="Cardiovascular protection",
            instructions="Take 1 tablet in the morning.",
            quantity_remaining=5,  # BELOW THRESHOLD! triggers refill alert
            refill_threshold=7,
            total_prescribed=30,
            prescribing_doctor_id=doc_vikram.id
        )
        # Discontinued historical medication
        med5_disc = Medication(
            elderly_profile_id=profile.id,
            name="Lisinopril",
            generic_name="Lisinopril",
            dosage_strength="10mg",
            form="tablet",
            color_code="#64748B",
            purpose="Blood Pressure",
            instructions="Take once daily in morning.",
            quantity_remaining=12,
            refill_threshold=5,
            total_prescribed=30,
            prescribing_doctor_id=doc_vikram.id,
            is_discontinued=True,
            discontinued_reason="Patient experienced persistent dry cough. Replaced with Amlodipine by Dr. Patel.",
            discontinued_at=datetime.now(timezone.utc) - timedelta(days=21)
        )

        db.add_all([med1, med2, med3, med4, med5_disc])
        db.commit()
        db.refresh(med1)
        db.refresh(med2)
        db.refresh(med3)
        db.refresh(med4)

        # 6. MEDICATION SCHEDULES
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        sched1 = MedicationSchedule(
            medication_id=med1.id,
            frequency_type="twice_daily",
            scheduled_times=["08:00", "20:00"],
            start_date=today_str,
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            reminder_minutes_before=15
        )
        sched2 = MedicationSchedule(
            medication_id=med2.id,
            frequency_type="daily",
            scheduled_times=["08:00"],
            start_date=today_str,
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            reminder_minutes_before=15
        )
        sched3 = MedicationSchedule(
            medication_id=med3.id,
            frequency_type="daily",
            scheduled_times=["21:00"],
            start_date=today_str,
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            reminder_minutes_before=15
        )
        sched4 = MedicationSchedule(
            medication_id=med4.id,
            frequency_type="daily",
            scheduled_times=["08:00"],
            start_date=today_str,
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            reminder_minutes_before=15
        )
        db.add_all([sched1, sched2, sched3, sched4])
        db.commit()

        # 7. GENERATE PAST ADHERENCE HISTORY (LAST 10 DAYS)
        # Create realistic history: Morning doses mostly taken; Evening doses show occasional unconfirmed
        for day_offset in range(10, 0, -1):
            past_date = (now - timedelta(days=day_offset)).date()
            
            # Morning Meds at 08:00
            m_time = datetime.combine(past_date, time(8, 0)).replace(tzinfo=timezone.utc)
            for m, s in [(med1, sched1), (med2, sched2), (med4, sched4)]:
                dose = ScheduledDose(
                    medication_id=m.id,
                    schedule_id=s.id,
                    scheduled_time=m_time,
                    dose_label=f"Morning Dose (08:00)",
                    dosage_amount=m.dosage_strength,
                    status="taken",
                    reminder_sent_at=m_time - timedelta(minutes=15),
                    confirmed_at=m_time + timedelta(minutes=12),
                    confirmed_by_id=elderly_user.id,
                    confirmation_method="self_reported_web",
                    notes="Taken after breakfast"
                )
                db.add(dose)
                db.commit()
                db.refresh(dose)

                adh = AdherenceEvent(
                    scheduled_dose_id=dose.id,
                    elderly_profile_id=profile.id,
                    status="taken",
                    recorded_at=dose.confirmed_at,
                    recorded_by_id=elderly_user.id,
                    recorded_by_role="elderly",
                    confirmation_type="self_reported",
                    delay_minutes=12,
                    notes="Taken on schedule"
                )
                db.add(adh)

            # Evening Meds at 20:00 & 21:00
            e_time = datetime.combine(past_date, time(20, 0)).replace(tzinfo=timezone.utc)
            # Days 3 and 7: unconfirmed evening dose to create clear pattern for ML engine
            is_unconf = day_offset in [3, 7]
            dose_status = "unconfirmed" if is_unconf else "taken"
            
            dose_e = ScheduledDose(
                medication_id=med1.id,
                schedule_id=sched1.id,
                scheduled_time=e_time,
                dose_label="Evening Dose (20:00)",
                dosage_amount=med1.dosage_strength,
                status=dose_status,
                reminder_sent_at=e_time - timedelta(minutes=15),
                confirmed_at=None if is_unconf else (e_time + timedelta(minutes=25)),
                confirmed_by_id=None if is_unconf else elderly_user.id,
                confirmation_method=None if is_unconf else "self_reported_web",
                notes="Unconfirmed evening dose" if is_unconf else "Taken after dinner"
            )
            db.add(dose_e)
            db.commit()
            db.refresh(dose_e)

            adh_e = AdherenceEvent(
                scheduled_dose_id=dose_e.id,
                elderly_profile_id=profile.id,
                status=dose_status,
                recorded_at=e_time + timedelta(minutes=60) if is_unconf else dose_e.confirmed_at,
                recorded_by_id=None if is_unconf else elderly_user.id,
                recorded_by_role="system" if is_unconf else "elderly",
                confirmation_type="system_timeout" if is_unconf else "self_reported",
                delay_minutes=60 if is_unconf else 25,
                notes="Evening reminder timed out" if is_unconf else "Taken"
            )
            db.add(adh_e)

            # Night Bedtime Atorvastatin at 21:00
            n_time = datetime.combine(past_date, time(21, 0)).replace(tzinfo=timezone.utc)
            dose_n = ScheduledDose(
                medication_id=med3.id,
                schedule_id=sched3.id,
                scheduled_time=n_time,
                dose_label="Bedtime Dose (21:00)",
                dosage_amount=med3.dosage_strength,
                status="taken",
                reminder_sent_at=n_time - timedelta(minutes=15),
                confirmed_at=n_time + timedelta(minutes=10),
                confirmed_by_id=elderly_user.id,
                confirmation_method="self_reported_voice",
                notes="Confirmed via voice assistant before sleep"
            )
            db.add(dose_n)
            db.commit()

        # 8. TODAY'S DOSES
        today_date = now.date()
        
        # Today 08:00 Morning Doses (Already Taken & Confirmed!)
        t_08 = datetime.combine(today_date, time(8, 0)).replace(tzinfo=timezone.utc)
        for m, s in [(med1, sched1), (med2, sched2), (med4, sched4)]:
            d_today_m = ScheduledDose(
                medication_id=m.id,
                schedule_id=s.id,
                scheduled_time=t_08,
                dose_label=f"Morning Dose (08:00)",
                dosage_amount=m.dosage_strength,
                status="taken",
                reminder_sent_at=t_08 - timedelta(minutes=15),
                confirmed_at=t_08 + timedelta(minutes=5),
                confirmed_by_id=elderly_user.id,
                confirmation_method="self_reported_voice",
                notes="Confirmed via Voice: 'I have taken my morning medicine.'"
            )
            db.add(d_today_m)
            db.commit()
            db.refresh(d_today_m)

            adh_today = AdherenceEvent(
                scheduled_dose_id=d_today_m.id,
                elderly_profile_id=profile.id,
                status="taken",
                recorded_at=d_today_m.confirmed_at,
                recorded_by_id=elderly_user.id,
                recorded_by_role="elderly",
                confirmation_type="self_reported",
                delay_minutes=5,
                notes="Voice confirmation logged successfully"
            )
            db.add(adh_today)

        # Today 20:00 Evening Dose (Scheduled / Unconfirmed for live testing)
        t_20 = datetime.combine(today_date, time(20, 0)).replace(tzinfo=timezone.utc)
        d_today_e = ScheduledDose(
            medication_id=med1.id,
            schedule_id=sched1.id,
            scheduled_time=t_20,
            dose_label="Evening Dose (20:00)",
            dosage_amount=med1.dosage_strength,
            status="scheduled",
            escalation_level=0
        )
        db.add(d_today_e)

        # Today 21:00 Bedtime Dose
        t_21 = datetime.combine(today_date, time(21, 0)).replace(tzinfo=timezone.utc)
        d_today_b = ScheduledDose(
            medication_id=med3.id,
            schedule_id=sched3.id,
            scheduled_time=t_21,
            dose_label="Bedtime Dose (21:00)",
            dosage_amount=med3.dosage_strength,
            status="scheduled",
            escalation_level=0
        )
        db.add(d_today_b)
        db.commit()

        # 9. UPCOMING APPOINTMENT & PRE-BRIEFING
        appt_date = now + timedelta(days=5, hours=2)
        appt1 = Appointment(
            elderly_profile_id=profile.id,
            doctor_id=doc_sarah.id,
            appointment_date=appt_date,
            duration_minutes=45,
            location_type="in_person",
            location_details="Room 402, Senior Health Pavilion",
            reason_for_visit="Quarterly Comprehensive Geriatric Review & HbA1c Follow-up",
            status="scheduled",
            accompanying_caregiver_id=family_user.id,
            caregiver_attendance_status="confirmed",
            pre_briefing_generated=True,
            pre_briefing_data={
                "adherence_rate": 88.5,
                "active_med_count": 4,
                "missed_doses_count": 2,
                "summary": "4 active medications, 88.5% adherence over last 14 days. 2 unconfirmed evening doses noted."
            },
            share_briefing_with_doctor=True,
            notes="Please bring recent blood glucose log and check knee joint mobility."
        )
        db.add(appt1)
        db.commit()

        # 10. CAREGIVER HANDOVER LOGS
        c_log1 = CaregiverLog(
            elderly_profile_id=profile.id,
            author_id=caretaker_user.id,
            shift_type="morning",
            date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
            blood_pressure="122/80 mmHg",
            heart_rate=72,
            blood_sugar=114.0,
            temperature=98.4,
            mood="cheerful",
            appetite="good",
            sleep_quality="peaceful",
            activities_assisted=["Morning medication assistance", "Breakfast prep", "15-minute garden walk"],
            observations="Mrs. Sharma reported feeling energetic today. Hydrated well.",
            handover_notes="Evening caregiver: remind her about the 8:00 PM Metformin dose with dinner."
        )
        c_log2 = CaregiverLog(
            elderly_profile_id=profile.id,
            author_id=caretaker_user.id,
            shift_type="morning",
            date=today_str,
            blood_pressure="124/82 mmHg",
            heart_rate=74,
            blood_sugar=118.0,
            temperature=98.6,
            mood="calm",
            appetite="good",
            sleep_quality="peaceful",
            activities_assisted=["Vitals check", "Assisted with reading prescription label", "Herbal tea preparation"],
            observations="Blood pressure stable within target range. Confirmed morning pills.",
            handover_notes="Mrs. Sharma plans to visit the local library this afternoon."
        )
        db.add_all([c_log1, c_log2])

        # 11. HEALTH OBSERVATION
        obs1 = HealthObservation(
            elderly_profile_id=profile.id,
            author_id=caretaker_user.id,
            observation_type="vital_trend",
            title="Blood Pressure Stabilization",
            description="Blood pressure has maintained steady systolic range (120-125 mmHg) following transition to Amlodipine.",
            severity="low"
        )
        obs2 = HealthObservation(
            elderly_profile_id=profile.id,
            author_id=caretaker_user.id,
            observation_type="mobility",
            title="Mild Right Knee Stiffness",
            description="Patient experienced mild stiffness after sitting for extended reading; eased after light stretching.",
            severity="medium"
        )
        db.add_all([obs1, obs2])

        # 12. SAMPLE NOTIFICATIONS & ESCALATION EVENT
        # Sample escalation event (Stage 2: Caretaker Alerted)
        esc1 = EscalationEvent(
            scheduled_dose_id=d_today_e.id,
            elderly_profile_id=profile.id,
            stage=2,
            status="active"
        )
        db.add(esc1)

        notif1 = Notification(
            user_id=elderly_user.id,
            elderly_profile_id=profile.id,
            title="CareCircle Reminder: Time for your Metformin",
            message="Time to take your Metformin (500mg) with dinner.",
            notification_type="medication_reminder",
            channel="email",
            delivery_status="delivered",
            email_recipient=elderly_user.email,
            sent_at=now - timedelta(hours=3),
            metadata_json={
                "title": "Time for your Metformin (500mg)",
                "subtitle": "Scheduled for dinner",
                "full_html": "<p>Reminder for Metformin 500mg with evening dinner.</p>"
            }
        )
        notif2 = Notification(
            user_id=elderly_user.id,
            elderly_profile_id=profile.id,
            title="CareCircle Refill Notice: Aspirin Low-Dose running low",
            message="Only 5 doses of Aspirin Low-Dose remaining (threshold: 7). Please request a refill.",
            notification_type="refill_alert",
            channel="email",
            delivery_status="delivered",
            email_recipient=elderly_user.email,
            sent_at=now - timedelta(hours=5),
            metadata_json={
                "title": "Refill Notice: Aspirin Low-Dose",
                "subtitle": "5 tablets remaining",
                "full_html": "<p>Aspirin Low-Dose is running low (5 tablets left). Contact your pharmacy.</p>"
            }
        )
        db.add_all([notif1, notif2])
        db.commit()

        logger.info("CareCircle seed data successfully loaded!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()
