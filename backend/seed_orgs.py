# backend/seed_orgs.py
"""
Seed organizations from the NTC client database.
Run: cd backend && python seed_orgs.py
"""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
import app.models
import app.rbac.models

from app.models import (
    User, UserRole as LegacyUserRole,
    Organization, Job, JobStatus
)
from app.rbac.models import Role, UserRole as RBACUserRole
from app.auth.service import hash_password


def gen_password(name: str) -> str:
    clean = "".join(c for c in name if c.isalnum())[:6].capitalize()
    return f"{clean}@Spotter24!"


def gen_email(name: str, index: int) -> str:
    clean = "".join(c for c in name.lower() if c.isalnum())[:12]
    return f"{clean}{index}@spotter-org.ng"


ORGS = [
    {
        "name": "Amadove Nigeria Limited",
        "address": "3, Awolowo Way, Ikeja, Lagos",
        "contact_name": "Mr Michael (MD/CEO)",
        "phone": "08030575677",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Education / Services",
        "jobs": [
            {
                "title": "Visa Officer",
                "salary_min": 70000, "salary_max": 70000,
                "education": "BSc", "age_min": 22, "age_max": 33,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Computer Literacy"],
                "description": "Visa processing officer. Must be computer literate.",
            },
            {
                "title": "Admission Officer",
                "salary_min": 80000, "salary_max": 80000,
                "education": "BSc", "age_min": 25, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Communication", "Administration"],
                "description": "Handles student admissions.",
            },
        ],
    },
    {
        "name": "GIIT Africa",
        "address": "3, Awolowo Way, Ikeja, Lagos",
        "contact_name": "Mr Yemi (MD/CEO)",
        "phone": "08060515658",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Technology / Training",
        "jobs": [
            {
                "title": "Software Developer",
                "salary_min": 50000, "salary_max": 100000,
                "education": "ND/HND/BSc", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Software Development", "Programming"],
                "description": "Software developer role at GIIT Africa.",
            },
            {
                "title": "Customer Service / Marketer",
                "salary_min": 40000, "salary_max": 40000,
                "education": "SSCE/ND", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Marketing", "Customer Service"],
                "description": "Customer service and marketing role.",
            },
        ],
    },
    {
        "name": "Chiffy Supermarket",
        "address": "3, Oduduwa Crescent, GRA, Ikeja & Egbeda, Lagos",
        "contact_name": "MD/CEO Chigozie",
        "phone": "08023711791",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Retail / Supermarket",
        "jobs": [
            {
                "title": "HR Officer",
                "salary_min": 50000, "salary_max": 50000,
                "education": "HND/BSc", "age_min": 30, "age_max": None,
                "gender": "any", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Human Resources", "Recruitment"],
                "description": "HR officer for supermarket. Not Yoruba preferred.",
            },
            {
                "title": "Accountant",
                "salary_min": 60000, "salary_max": 60000,
                "education": "HND/BSc", "age_min": 30, "age_max": None,
                "gender": "any", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Accounting", "Finance"],
                "description": "Accountant for supermarket operations.",
            },
            {
                "title": "Deputy Manager",
                "salary_min": 70000, "salary_max": 70000,
                "education": "HND/BSc", "age_min": 30, "age_max": None,
                "gender": "female", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Management", "Operations"],
                "description": "Female deputy manager for supermarket.",
            },
            {
                "title": "Procurement Officer",
                "salary_min": 60000, "salary_max": 60000,
                "education": "HND/BSc", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Procurement", "Supply Chain"],
                "description": "Procurement officer. No Edo or Delta State applicants.",
            },
            {
                "title": "Supermarket Manager",
                "salary_min": 80000, "salary_max": 100000,
                "education": "HND/BSc", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Retail Management", "Operations"],
                "description": "Supermarket manager. No Edo or Delta State applicants.",
            },
        ],
    },
    {
        "name": "East Gate Hotel",
        "address": "Orchid Road, Lekki, Lagos",
        "contact_name": "Mr Charles",
        "phone": "08060976532",
        "city": "Lekki", "state": "Lagos",
        "industry": "Hospitality",
        "jobs": [
            {
                "title": "Hotel Manager",
                "salary_min": 50000, "salary_max": None,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": 4,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Hotel Management", "Leadership"],
                "description": "Graduate hotel manager. 4-5 years experience. Must be married.",
            },
            {
                "title": "Lounge Supervisor",
                "salary_min": 50000, "salary_max": None,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": 4,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Hospitality", "Supervision"],
                "description": "Lounge supervisor. 4-5 years experience.",
            },
            {
                "title": "Marketer",
                "salary_min": 50000, "salary_max": None,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": 4,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Marketing", "Sales"],
                "description": "Hotel marketer. 4-5 years experience.",
            },
        ],
    },
    {
        "name": "Tilapia and Tins",
        "address": "11, Oduduwa Crescent, GRA, Ikeja, Lagos",
        "contact_name": "Chief Nokam (MD/CEO)",
        "phone": "08088500010",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Restaurant / Food",
        "jobs": [
            {
                "title": "Account Officer",
                "salary_min": 100000, "salary_max": 100000,
                "education": "BSc", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Accounting", "Finance"],
                "description": "Experienced account officer.",
            },
            {
                "title": "Waiter",
                "salary_min": 50000, "salary_max": 70000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Hospitality"],
                "description": "Experienced waiter.",
            },
            {
                "title": "Kitchen Assistant",
                "salary_min": 40000, "salary_max": 40000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Food Preparation"],
                "description": "Kitchen assistance role.",
            },
            {
                "title": "Bar Tender",
                "salary_min": 70000, "salary_max": 70000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Bartending", "Hospitality"],
                "description": "Experienced bar tender.",
            },
            {
                "title": "Female Business Manager",
                "salary_min": 300000, "salary_max": 300000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Business Management", "Leadership"],
                "description": "Female business manager required.",
            },
        ],
    },
    {
        "name": "Serendipity Archotel",
        "address": "1A Abiodun Street, Off Ladipo Kuku, Allen, Lagos",
        "contact_name": "MD",
        "phone": "08033070681",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Hospitality",
        "jobs": [
            {
                "title": "Receptionist",
                "salary_min": 35000, "salary_max": 40000,
                "education": "SSCE/ND", "age_min": 20, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Communication"],
                "description": "Hotel receptionist.",
            },
            {
                "title": "PA / Admin / Supervisor",
                "salary_min": 50000, "salary_max": 50000,
                "education": "ND", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Administration", "Supervision"],
                "description": "Personal assistant / admin supervisor.",
            },
            {
                "title": "Waiter",
                "salary_min": 35000, "salary_max": 35000,
                "education": "SSCE/ND", "age_min": 20, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Hospitality", "Customer Service"],
                "description": "Male waiter.",
            },
            {
                "title": "Cook",
                "salary_min": 40000, "salary_max": 40000,
                "education": "SSCE/ND", "age_min": 20, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Cooking", "Food Preparation"],
                "description": "Female cook.",
            },
        ],
    },
    {
        "name": "Obejor Telecoms",
        "address": "17, Obafemi Awolowo Way, Ikeja, Lagos",
        "contact_name": "Mr Ndubisi Ikechukwu",
        "phone": "08032037060",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Telecommunications",
        "jobs": [
            {
                "title": "Digital Marketer / Social Media Handler",
                "salary_min": 60000, "salary_max": 100000,
                "education": "HND", "age_min": 35, "age_max": 35,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Digital Marketing", "Social Media"],
                "description": "Digital marketer and social media handler.",
            },
            {
                "title": "HR Officer",
                "salary_min": 120000, "salary_max": 150000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Human Resources", "Recruitment"],
                "description": "HR officer for telecoms company.",
            },
            {
                "title": "Customer Service Support",
                "salary_min": 100000, "salary_max": 100000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Communication"],
                "description": "Customer service support officer.",
            },
            {
                "title": "Business Development Officer",
                "salary_min": 120000, "salary_max": 150000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Business Development", "Sales"],
                "description": "Business development officer.",
            },
            {
                "title": "Sales Representative",
                "salary_min": 80000, "salary_max": 80000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Sales", "Communication"],
                "description": "Sales representative.",
            },
            {
                "title": "Procurement Officer",
                "salary_min": 100000, "salary_max": 120000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Procurement", "Supply Chain"],
                "description": "Procurement officer.",
            },
        ],
    },
    {
        "name": "Meditrack Limited",
        "address": "Jabita Court, Alake Onile-Ere Crescent, Gbagada Phase 2, Lagos",
        "contact_name": "Manager",
        "phone": "08104800959",
        "city": "Gbagada", "state": "Lagos",
        "industry": "Healthcare / Management",
        "jobs": [
            {
                "title": "Accountant",
                "salary_min": 100000, "salary_max": None,
                "education": "HND/BSc", "age_min": 24, "age_max": 35,
                "gender": "male", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Accounting", "ACA Certificate"],
                "description": "Accountant. 1-2 years experience. ACA certificate preferred. Yoruba preferred.",
            },
            {
                "title": "HR Assistant",
                "salary_min": 65000, "salary_max": 100000,
                "education": "HND/BSc", "age_min": 24, "age_max": 35,
                "gender": "male", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Human Resources", "Employment Law"],
                "description": "HR assistant. Knowledge of employment laws crucial. Yoruba preferred.",
            },
            {
                "title": "Facility Manager",
                "salary_min": 100000, "salary_max": None,
                "education": "HND/BSc", "age_min": 30, "age_max": 35,
                "gender": "male", "years_experience": 3,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Facility Management", "Professional Certification"],
                "description": "Facility manager. 2-3 years experience. Professional certification required.",
            },
        ],
    },
    {
        "name": "CMG Energy Group",
        "address": "20, Michael Adekoya Street, Ilupeju, Lagos",
        "contact_name": "Executive Chairman",
        "phone": "08034770481",
        "city": "Ilupeju", "state": "Lagos",
        "industry": "Energy",
        "jobs": [
            {
                "title": "Marketing Officer (Field and Digital)",
                "salary_min": 60000, "salary_max": 120000,
                "education": "HND/BSc", "age_min": 24, "age_max": None,
                "gender": "any", "years_experience": 2,
                "work_mode": "hybrid", "employment_type": "full_time",
                "required_skills": ["Marketing", "Digital Marketing", "Field Sales"],
                "description": "Field and digital marketing. 2 years experience.",
            },
            {
                "title": "Accountant",
                "salary_min": 60000, "salary_max": 120000,
                "education": "HND/BSc", "age_min": 24, "age_max": None,
                "gender": "any", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Accounting", "Finance"],
                "description": "Accountant. 2 years experience.",
            },
            {
                "title": "Logistics Operations with DMS",
                "salary_min": 60000, "salary_max": 120000,
                "education": "HND/BSc", "age_min": 24, "age_max": None,
                "gender": "male", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Logistics", "DMS", "Operations"],
                "description": "Logistics operations with DMS experience. 2 years.",
            },
            {
                "title": "Generator and Gas Engineer",
                "salary_min": 60000, "salary_max": 120000,
                "education": "HND/BSc", "age_min": 24, "age_max": None,
                "gender": "male", "years_experience": 2,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Engineering", "Generator Maintenance", "Gas"],
                "description": "Generator and gas engineer. 2 years experience.",
            },
            {
                "title": "Web Developer / Builder",
                "salary_min": 60000, "salary_max": 120000,
                "education": "HND/BSc", "age_min": 24, "age_max": None,
                "gender": "any", "years_experience": 2,
                "work_mode": "hybrid", "employment_type": "full_time",
                "required_skills": ["Web Development", "HTML", "CSS", "JavaScript"],
                "description": "Web developer/builder. 2 years experience.",
            },
        ],
    },
    {
        "name": "Santana Security",
        "address": "13, Odejayi Crescent, Off Akinhanmi Street, Surulere, Lagos",
        "contact_name": "Operations Manager",
        "phone": "08172170540",
        "city": "Surulere", "state": "Lagos",
        "industry": "Security",
        "jobs": [
            {
                "title": "Security Guard",
                "salary_min": 40000, "salary_max": 70000,
                "education": "SSCE", "age_min": 24, "age_max": 45,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Security", "Surveillance"],
                "description": "Security guard.",
            },
            {
                "title": "Secretary",
                "salary_min": 50000, "salary_max": None,
                "education": "ND/HND/BSc", "age_min": 18, "age_max": 35,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Administration", "Computer Literacy"],
                "description": "Secretary.",
            },
            {
                "title": "Financial Controller",
                "salary_min": 250000, "salary_max": 300000,
                "education": "HND/BSc", "age_min": 24, "age_max": 40,
                "gender": "any", "years_experience": 7,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Finance", "Accounting", "Financial Control"],
                "description": "Financial controller. 7 years experience required.",
            },
            {
                "title": "Operational Supervisor",
                "salary_min": 90000, "salary_max": 90000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Supervision", "Operations", "Security"],
                "description": "Operational supervisor.",
            },
            {
                "title": "Driver",
                "salary_min": 110000, "salary_max": 110000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Driving", "Valid License"],
                "description": "Driver with valid license.",
            },
        ],
    },
    {
        "name": "Jollof by Jara",
        "address": "33, Folaosibo, Lekki, Lagos",
        "contact_name": "CEO",
        "phone": "07034058140",
        "city": "Lekki", "state": "Lagos",
        "industry": "Restaurant / Hospitality",
        "jobs": [
            {
                "title": "General Manager",
                "salary_min": 250000, "salary_max": 250000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Management", "Restaurant Operations", "Leadership"],
                "description": "Experienced general manager for restaurant.",
            },
            {
                "title": "Floor Supervisor",
                "salary_min": 100000, "salary_max": 100000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Supervision", "Hospitality"],
                "description": "Floor supervisor. Experienced.",
            },
            {
                "title": "Mixologist",
                "salary_min": 120000, "salary_max": 120000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Bartending", "Mixology"],
                "description": "Experienced mixologist.",
            },
            {
                "title": "Waiter / Waitress",
                "salary_min": 70000, "salary_max": 70000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Hospitality"],
                "description": "Experienced waiters and waitresses.",
            },
        ],
    },
    {
        "name": "Elites Holding Limited",
        "address": "3, Amusan Oloyede Street, Off Tokunbo Alli, Ikeja, Lagos",
        "contact_name": "CEO",
        "phone": "08169040106",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Business / Consulting",
        "jobs": [
            {
                "title": "Marketing / Brand Manager",
                "salary_min": 150000, "salary_max": 150000,
                "education": "Graduate", "age_min": 25, "age_max": 40,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Marketing", "Brand Management"],
                "description": "Experienced marketing and brand manager.",
            },
            {
                "title": "Business Development Manager",
                "salary_min": 150000, "salary_max": 150000,
                "education": "Graduate", "age_min": 25, "age_max": 40,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Business Development", "Sales", "Strategy"],
                "description": "Experienced business development manager.",
            },
            {
                "title": "HR Manager",
                "salary_min": 200000, "salary_max": 200000,
                "education": "Graduate", "age_min": 25, "age_max": 40,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Human Resources", "Recruitment", "HR Management"],
                "description": "Experienced HR manager.",
            },
            {
                "title": "Driver",
                "salary_min": 80000, "salary_max": 80000,
                "education": "Any", "age_min": 25, "age_max": 40,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Driving", "Valid License"],
                "description": "Experienced driver with valid license.",
            },
        ],
    },
    {
        "name": "Sarom Restaurant",
        "address": "3, Oluwakemi Street, Alapere Roundabout, Ketu, Lagos",
        "contact_name": "MD",
        "phone": "08022697053",
        "city": "Ketu", "state": "Lagos",
        "industry": "Restaurant / Food",
        "jobs": [
            {
                "title": "Pastry Chef",
                "salary_min": 100000, "salary_max": 100000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Pastry", "Baking", "Food Preparation"],
                "description": "Experienced pastry chef.",
            },
            {
                "title": "Chef",
                "salary_min": 150000, "salary_max": 150000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Cooking", "Food Preparation", "Kitchen Management"],
                "description": "Experienced chef.",
            },
            {
                "title": "Grill Chef",
                "salary_min": 150000, "salary_max": 150000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Grilling", "Cooking"],
                "description": "Experienced grill chef.",
            },
            {
                "title": "Driver",
                "salary_min": 120000, "salary_max": 120000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Driving", "Valid License"],
                "description": "Drivers needed.",
            },
            {
                "title": "Dispatch Rider",
                "salary_min": 120000, "salary_max": 120000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Dispatch", "Motorcycle Riding"],
                "description": "Dispatch riders needed.",
            },
            {
                "title": "Cleaner",
                "salary_min": 70000, "salary_max": 70000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Cleaning"],
                "description": "Cleaners needed.",
            },
            {
                "title": "Customer Service Officer",
                "salary_min": 80000, "salary_max": 80000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Communication"],
                "description": "Customer service officer.",
            },
            {
                "title": "Store Keeper",
                "salary_min": 80000, "salary_max": 80000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Inventory", "Store Management"],
                "description": "Store keeper.",
            },
        ],
    },
    {
        "name": "Woodmarble Hotel",
        "address": "93, Shipeola Street, Palmgroove, Lagos",
        "contact_name": "Manager",
        "phone": "09036249943",
        "city": "Palmgroove", "state": "Lagos",
        "industry": "Hospitality",
        "jobs": [
            {
                "title": "Receptionist",
                "salary_min": 50000, "salary_max": 50000,
                "education": "ND/HND", "age_min": 22, "age_max": 30,
                "gender": "female", "years_experience": 1,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Communication", "Computer Literacy"],
                "description": "Hotel receptionist. 1-2 years experience.",
            },
            {
                "title": "Housekeeper",
                "salary_min": 30000, "salary_max": 30000,
                "education": "SSCE", "age_min": 19, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Housekeeping", "Cleaning"],
                "description": "Hotel housekeeper.",
            },
            {
                "title": "Accountant",
                "salary_min": 70000, "salary_max": 70000,
                "education": "ND/HND/BSc", "age_min": 22, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Accounting", "Finance"],
                "description": "Hotel accountant.",
            },
        ],
    },
    {
        "name": "Millie Hill by Jara",
        "address": "Eleko, Ibeju Lekki, Lagos",
        "contact_name": "CEO",
        "phone": "07034058140",
        "city": "Ibeju Lekki", "state": "Lagos",
        "industry": "Hospitality / Hotel",
        "jobs": [
            {
                "title": "Guest Service / Front Desk Officer",
                "salary_min": 150000, "salary_max": 200000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Front Desk", "Communication"],
                "description": "Guest service and front desk officer. Female graduate.",
            },
            {
                "title": "Housekeeper",
                "salary_min": 150000, "salary_max": 150000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Housekeeping", "Hospitality"],
                "description": "Female housekeeper. Graduate.",
            },
        ],
    },
    {
        "name": "Broad Kapital Business Solution",
        "address": "146, Obafemi Awolowo Way, Off Lagos Airport Hotel, Ikeja, Lagos",
        "contact_name": "Miss Gift",
        "phone": "09028232934",
        "city": "Ikeja", "state": "Lagos",
        "industry": "Business / Marketing",
        "jobs": [
            {
                "title": "Marketer",
                "salary_min": 75000, "salary_max": 75000,
                "education": "Any", "age_min": 20, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Marketing", "Sales", "Communication"],
                "description": "100 marketers needed.",
            },
        ],
    },
    {
        "name": "Eritville Gift Company",
        "address": "No 2, First Foundation Close, Besides Adebola House, Opebi, Lagos",
        "contact_name": "CEO",
        "phone": "09060008075",
        "city": "Opebi", "state": "Lagos",
        "industry": "Retail / Gifts",
        "jobs": [
            {
                "title": "Customer Service / Sales Representative",
                "salary_min": 120000, "salary_max": 120000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Sales"],
                "description": "Customer service and sales rep. Female graduate.",
            },
            {
                "title": "Social Media Manager",
                "salary_min": 150000, "salary_max": 150000,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "hybrid", "employment_type": "full_time",
                "required_skills": ["Social Media", "Content Creation", "Digital Marketing"],
                "description": "Social media manager.",
            },
            {
                "title": "Admin Personnel",
                "salary_min": 100000, "salary_max": 120000,
                "education": "Any", "age_min": None, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Administration", "Computer Literacy"],
                "description": "Admin personnel. Female.",
            },
        ],
    },
    {
        "name": "Heartbreach Law Firm",
        "address": "14, Salvation Street, Opebi, Ikeja, Lagos",
        "contact_name": "MD",
        "phone": "08022888007",
        "city": "Opebi", "state": "Lagos",
        "industry": "Legal / Law",
        "jobs": [
            {
                "title": "Lawyer",
                "salary_min": 70000, "salary_max": None,
                "education": "Graduate", "age_min": None, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Law", "Legal Research", "Litigation"],
                "description": "Experienced lawyer.",
            },
            {
                "title": "Front Desk Officer",
                "salary_min": 50000, "salary_max": 100000,
                "education": "ND/HND/BSc", "age_min": 22, "age_max": None,
                "gender": "female", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Computer Literacy"],
                "description": "Female front desk officer. Computer literate.",
            },
        ],
    },
    {
        "name": "Allure Cosmetics",
        "address": "Pentagon Plaza, 23 Opebi Road, Ikeja, Lagos",
        "contact_name": "Manager",
        "phone": "08036272801",
        "city": "Opebi", "state": "Lagos",
        "industry": "Beauty / Cosmetics",
        "jobs": [
            {
                "title": "Customer Care Officer",
                "salary_min": 70000, "salary_max": 70000,
                "education": "OND/HND/BSc", "age_min": 20, "age_max": None,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Customer Service", "Communication"],
                "description": "Customer care officer.",
            },
            {
                "title": "Accountant",
                "salary_min": 100000, "salary_max": 100000,
                "education": "Graduate", "age_min": 22, "age_max": 30,
                "gender": "any", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Accounting", "Finance"],
                "description": "Experienced accountant.",
            },
            {
                "title": "Inventory / Logistics Officer",
                "salary_min": 70000, "salary_max": 70000,
                "education": "Graduate", "age_min": 20, "age_max": 35,
                "gender": "male", "years_experience": None,
                "work_mode": "onsite", "employment_type": "full_time",
                "required_skills": ["Inventory Management", "Logistics"],
                "description": "Inventory and logistics officer.",
            },
        ],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:

        # Load role map
        role_map = {}
        result = await db.execute(select(Role))
        for role in result.scalars().all():
            role_map[role.slug] = role

        if not role_map:
            print("❌ No roles found. Run seed_admin.py first to seed roles.")
            return

        org_role = role_map.get("org")
        if not org_role:
            print("❌ 'org' role not found. Run seed_admin.py first.")
            return

        print(f"\n── Seeding {len(ORGS)} organisations ──────────────────────\n")
        seeded_orgs = 0
        seeded_jobs = 0
        credentials = []

        for i, org_data in enumerate(ORGS, start=1):
            email = gen_email(org_data["name"], i)
            password = gen_password(org_data["name"])

            # Check if user exists
            result = await db.execute(select(User).where(User.email == email))
            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(f"  (exists) {org_data['name']}: {email}")
                org_result = await db.execute(
                    select(Organization).where(Organization.user_id == existing_user.id)
                )
                org = org_result.scalar_one_or_none()
            else:
                # Create user
                user = User(
                    email=email,
                    password_hash=hash_password(password),
                    role=LegacyUserRole.ORG,
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                await db.flush()

                # Assign RBAC role
                db.add(RBACUserRole(
                    user_id=user.id,
                    role_id=org_role.id,
                    is_primary=True,
                ))
                await db.flush()

                # Create organisation
                org = Organization(
                    user_id=user.id,
                    name=org_data["name"],
                    description=f"{org_data['name']} — {org_data['industry']}",
                    industry=org_data["industry"],
                    address=org_data.get("address"),
                    phone=org_data.get("phone"),
                    city=org_data["city"],
                    state=org_data["state"],
                    free_posts_left=0,
                    free_matches_left=0,
                    is_verified=True,
                )
                db.add(org)
                await db.flush()
                seeded_orgs += 1
                credentials.append((org_data["name"], email, password))
                print(f"  ✓ [{i:03}] {org_data['name']}")

            # Seed jobs
            if org:
                for job_data in org_data.get("jobs", []):
                    if not job_data.get("title"):
                        continue

                    existing_job = await db.execute(
                        select(Job).where(
                            Job.org_id == org.id,
                            Job.title == job_data["title"],
                        )
                    )
                    if existing_job.scalar_one_or_none():
                        continue

                    salary_min = job_data.get("salary_min")
                    salary_max = job_data.get("salary_max") or salary_min

                    # Normalize gender — model stores as string
                    gender = job_data.get("gender")
                    if gender and gender.lower() in ("any", "both"):
                        gender = None

                    job = Job(
                        org_id=org.id,
                        agent_id=None,
                        poster_type="org",              # ← required field fixed
                        title=job_data["title"],
                        description=job_data.get("description", ""),
                        city=org_data["city"],
                        state=org_data["state"],
                        work_mode=job_data.get("work_mode", "onsite"),
                        employment_type=job_data.get("employment_type", "full_time"),
                        salary_min=salary_min,
                        salary_max=salary_max,
                        required_skills=job_data.get("required_skills", []),
                        required_tech_stack=[],
                        certifications_required=[],
                        licenses_required=[],
                        required_education=job_data.get("education"),
                        preferred_gender=gender,
                        preferred_age_min=job_data.get("age_min"),
                        preferred_age_max=job_data.get("age_max"),
                        required_experience_years=job_data.get("years_experience"),
                        status=JobStatus.ACTIVE,        # ← enum value fixed
                    )
                    db.add(job)
                    seeded_jobs += 1

        await db.commit()

        # ── Final credentials printout ─────────────────────────────────
        print(f"\n════════════════════════════════════════════════════════════════════")
        print(f"  ✅ Seeded {seeded_orgs} new organisations and {seeded_jobs} jobs!")
        print(f"════════════════════════════════════════════════════════════════════")
        print(f"\n  {'#':<4} {'Organisation':<35} {'Email':<38} {'Password'}")
        print(f"  {'─'*4} {'─'*35} {'─'*38} {'─'*20}")
        for idx, (name, email, pwd) in enumerate(credentials, start=1):
            print(f"  {idx:<4} {name:<35} {email:<38} {pwd}")
        print(f"════════════════════════════════════════════════════════════════════\n")


if __name__ == "__main__":
    asyncio.run(seed())

    



# # backend/seed_orgs.py
# """
# Seed organizations from the NTC client database.
# Run: cd backend && python seed_orgs.py
# """
# import asyncio
# import random
# import string
# from sqlalchemy import select
# from app.database import AsyncSessionLocal, engine, Base
# import app.models
# import app.rbac.models

# from app.models import (
#     User, UserRole as LegacyUserRole,
#     Organization, Job, MatchingWeight
# )
# from app.rbac.models import Role, UserRole as RBACUserRole
# from app.auth.service import hash_password


# def gen_password(name: str) -> str:
#     """Generate a simple but unique password from org name."""
#     clean = "".join(c for c in name if c.isalnum())[:6].capitalize()
#     return f"{clean}@Spotter24!"


# def gen_email(name: str, index: int) -> str:
#     clean = "".join(c for c in name.lower() if c.isalnum())[:12]
#     return f"{clean}{index}@spotter-org.ng"


# # ── Organisation + Jobs data ────────────────────────────────────────────────
# ORGS = [
#     {
#         "name": "Amadove Nigeria Limited",
#         "address": "3, Awolowo Way, Ikeja, Lagos",
#         "contact_name": "Mr Michael (MD/CEO)",
#         "phone": "08030575677",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Education / Services",
#         "jobs": [
#             {
#                 "title": "Visa Officer",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "BSc", "age_min": 22, "age_max": 33,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Computer Literacy"],
#                 "description": "Visa processing officer. Must be computer literate.",
#             },
#             {
#                 "title": "Admission Officer",
#                 "salary_min": 80000, "salary_max": 80000,
#                 "education": "BSc", "age_min": 25, "age_max": None,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Communication", "Administration"],
#                 "description": "Handles student admissions.",
#             },
#         ],
#     },
#     {
#         "name": "GIIT Africa",
#         "address": "3, Awolowo Way, Ikeja, Lagos",
#         "contact_name": "Mr Yemi (MD/CEO)",
#         "phone": "08060515658",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Technology / Training",
#         "jobs": [
#             {
#                 "title": "Software Developer",
#                 "salary_min": 50000, "salary_max": 100000,
#                 "education": "ND/HND/BSc",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Software Development", "Programming"],
#                 "description": "Software developer role at GIIT Africa.",
#             },
#             {
#                 "title": "Customer Service / Marketer",
#                 "salary_min": 40000, "salary_max": 40000,
#                 "education": "SSCE/ND",
#                 "gender": "female", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Marketing", "Customer Service"],
#                 "description": "Customer service and marketing role.",
#             },
#         ],
#     },
#     {
#         "name": "Chiffy Supermarket",
#         "address": "3, Oduduwa Crescent, GRA, Ikeja & Egbeda, Lagos",
#         "contact_name": "MD/CEO Chigozie",
#         "phone": "08023711791",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Retail / Supermarket",
#         "jobs": [
#             {
#                 "title": "HR Officer",
#                 "salary_min": 50000, "salary_max": 50000,
#                 "education": "HND/BSc", "age_min": 30, "age_max": None,
#                 "gender": "any", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Human Resources", "Recruitment"],
#                 "description": "HR officer for supermarket. Not Yoruba preferred.",
#             },
#             {
#                 "title": "Accountant",
#                 "salary_min": 60000, "salary_max": 60000,
#                 "education": "HND/BSc", "age_min": 30, "age_max": None,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Accounting", "Finance"],
#                 "description": "Accountant for supermarket operations.",
#             },
#             {
#                 "title": "Deputy Manager",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "HND/BSc", "age_min": 30, "age_max": None,
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Management", "Operations"],
#                 "description": "Female deputy manager for supermarket.",
#             },
#             {
#                 "title": "Procurement Officer",
#                 "salary_min": 60000, "salary_max": 60000,
#                 "education": "HND/BSc",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Procurement", "Supply Chain"],
#                 "description": "Procurement officer. No Edo or Delta State applicants.",
#             },
#             {
#                 "title": "Supermarket Manager",
#                 "salary_min": 80000, "salary_max": 100000,
#                 "education": "HND/BSc",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Retail Management", "Operations"],
#                 "description": "Supermarket manager. No Edo or Delta State applicants.",
#             },
#         ],
#     },
#     {
#         "name": "East Gate Hotel",
#         "address": "Orchid Road, Lekki, Lagos",
#         "contact_name": "Mr Charles",
#         "phone": "08060976532",
#         "city": "Lekki", "state": "Lagos",
#         "industry": "Hospitality",
#         "jobs": [
#             {
#                 "title": "Hotel Manager",
#                 "salary_min": 50000, "salary_max": None,
#                 "education": "Graduate", "age_min": None, "age_max": None,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Hotel Management", "Leadership"],
#                 "description": "Graduate hotel manager. 4-5 years experience. Must be married.",
#             },
#             {
#                 "title": "Lounge Supervisor",
#                 "salary_min": 50000, "salary_max": None,
#                 "education": "Graduate",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Hospitality", "Supervision"],
#                 "description": "Lounge supervisor. 4-5 years experience.",
#             },
#             {
#                 "title": "Marketer",
#                 "salary_min": 50000, "salary_max": None,
#                 "education": "Graduate",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Marketing", "Sales"],
#                 "description": "Hotel marketer. 4-5 years experience.",
#             },
#         ],
#     },
#     {
#         "name": "Tilapia and Tins",
#         "address": "11, Oduduwa Crescent, GRA, Ikeja, Lagos",
#         "contact_name": "Chief Nokam (MD/CEO)",
#         "phone": "08088500010",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Restaurant / Food",
#         "jobs": [
#             {
#                 "title": "Account Officer",
#                 "salary_min": 100000, "salary_max": 100000,
#                 "education": "BSc",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Accounting", "Finance"],
#                 "description": "Experienced account officer.",
#             },
#             {
#                 "title": "Waiter",
#                 "salary_min": 50000, "salary_max": 70000,
#                 "education": "Graduate",
#                 "gender": "male", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Hospitality"],
#                 "description": "Experienced waiter.",
#             },
#             {
#                 "title": "Kitchen Assistant",
#                 "salary_min": 40000, "salary_max": 40000,
#                 "education": "Graduate",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Food Preparation"],
#                 "description": "Kitchen assistance role.",
#             },
#             {
#                 "title": "Bar Tender",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "Any",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Bartending", "Hospitality"],
#                 "description": "Experienced bar tender.",
#             },
#             {
#                 "title": "Female Business Manager",
#                 "salary_min": 300000, "salary_max": 300000,
#                 "education": "Graduate",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Business Management", "Leadership"],
#                 "description": "Female business manager required.",
#             },
#         ],
#     },
#     {
#         "name": "Serendipity Archotel",
#         "address": "1A Abiodun Street, Off Ladipo Kuku, Allen, Lagos",
#         "contact_name": "MD",
#         "phone": "08033070681",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Hospitality",
#         "jobs": [
#             {
#                 "title": "Receptionist",
#                 "salary_min": 35000, "salary_max": 40000,
#                 "education": "SSCE/ND", "age_min": 20, "age_max": None,
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Communication"],
#                 "description": "Hotel receptionist.",
#             },
#             {
#                 "title": "PA / Admin / Supervisor",
#                 "salary_min": 50000, "salary_max": 50000,
#                 "education": "ND",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Administration", "Supervision"],
#                 "description": "Personal assistant / admin supervisor.",
#             },
#             {
#                 "title": "Waiter",
#                 "salary_min": 35000, "salary_max": 35000,
#                 "education": "SSCE/ND", "age_min": 20,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Hospitality", "Customer Service"],
#                 "description": "Male waiter.",
#             },
#             {
#                 "title": "Cook",
#                 "salary_min": 40000, "salary_max": 40000,
#                 "education": "SSCE/ND", "age_min": 20,
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Cooking", "Food Preparation"],
#                 "description": "Female cook.",
#             },
#         ],
#     },
#     {
#         "name": "Obejor Telecoms",
#         "address": "17, Obafemi Awolowo Way, Ikeja, Lagos",
#         "contact_name": "Mr Ndubisi Ikechukwu",
#         "phone": "08032037060",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Telecommunications",
#         "jobs": [
#             {
#                 "title": "Digital Marketer / Social Media Handler",
#                 "salary_min": 60000, "salary_max": 100000,
#                 "education": "HND", "age_min": 35, "age_max": 35,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Digital Marketing", "Social Media"],
#                 "description": "Digital marketer and social media handler.",
#             },
#             {
#                 "title": "HR Officer",
#                 "salary_min": 120000, "salary_max": 150000,
#                 "education": "Graduate",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Human Resources", "Recruitment"],
#                 "description": "HR officer for telecoms company.",
#             },
#             {
#                 "title": "Customer Service Support",
#                 "salary_min": 100000, "salary_max": 100000,
#                 "education": "Any",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Communication"],
#                 "description": "Customer service support officer.",
#             },
#             {
#                 "title": "Business Development Officer",
#                 "salary_min": 120000, "salary_max": 150000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Business Development", "Sales"],
#                 "description": "Business development officer.",
#             },
#             {
#                 "title": "Sales Representative",
#                 "salary_min": 80000, "salary_max": 80000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Sales", "Communication"],
#                 "description": "Sales representative.",
#             },
#             {
#                 "title": "Procurement Officer",
#                 "salary_min": 100000, "salary_max": 120000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Procurement", "Supply Chain"],
#                 "description": "Procurement officer.",
#             },
#         ],
#     },
#     {
#         "name": "Meditrack Limited",
#         "address": "Jabita Court, Alake Onile-Ere Crescent, Gbagada Phase 2, Lagos",
#         "contact_name": "Manager",
#         "phone": "08104800959",
#         "city": "Gbagada", "state": "Lagos",
#         "industry": "Healthcare / Management",
#         "jobs": [
#             {
#                 "title": "Accountant",
#                 "salary_min": 100000, "salary_max": None,
#                 "education": "HND/BSc", "age_min": 24, "age_max": 35,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Accounting", "ACA Certificate"],
#                 "description": "Accountant. 1-2 years experience. ACA certificate preferred. Yoruba preferred.",
#             },
#             {
#                 "title": "HR Assistant",
#                 "salary_min": 65000, "salary_max": 100000,
#                 "education": "HND/BSc", "age_min": 24, "age_max": 35,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Human Resources", "Employment Law"],
#                 "description": "HR assistant. Knowledge of employment laws crucial. Yoruba preferred.",
#             },
#             {
#                 "title": "Facility Manager",
#                 "salary_min": 100000, "salary_max": None,
#                 "education": "HND/BSc", "age_min": 30, "age_max": 35,
#                 "gender": "male", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Facility Management", "Professional Certification"],
#                 "description": "Facility manager. 2-3 years experience. Professional certification required.",
#             },
#         ],
#     },
#     {
#         "name": "CMG Energy Group",
#         "address": "20, Michael Adekoya Street, Ilupeju, Lagos",
#         "contact_name": "Executive Chairman",
#         "phone": "08034770481",
#         "city": "Ilupeju", "state": "Lagos",
#         "industry": "Energy",
#         "jobs": [
#             {
#                 "title": "Marketing Officer (Field and Digital)",
#                 "salary_min": 60000, "salary_max": 120000,
#                 "education": "HND/BSc", "age_min": 24,
#                 "gender": "any", "openings": 4,
#                 "work_mode": "hybrid", "employment_type": "full_time",
#                 "required_skills": ["Marketing", "Digital Marketing", "Field Sales"],
#                 "description": "Field and digital marketing. 2 years experience.",
#             },
#             {
#                 "title": "Accountant",
#                 "salary_min": 60000, "salary_max": 120000,
#                 "education": "HND/BSc", "age_min": 24,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Accounting", "Finance"],
#                 "description": "Accountant. 2 years experience.",
#             },
#             {
#                 "title": "Logistics Operations with DMS",
#                 "salary_min": 60000, "salary_max": 120000,
#                 "education": "HND/BSc", "age_min": 24,
#                 "gender": "male", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Logistics", "DMS", "Operations"],
#                 "description": "Logistics operations with DMS experience. 2 years.",
#             },
#             {
#                 "title": "Generator and Gas Engineer",
#                 "salary_min": 60000, "salary_max": 120000,
#                 "education": "HND/BSc", "age_min": 24,
#                 "gender": "male", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Engineering", "Generator Maintenance", "Gas"],
#                 "description": "Generator and gas engineer. 2 years experience.",
#             },
#             {
#                 "title": "Web Developer / Builder",
#                 "salary_min": 60000, "salary_max": 120000,
#                 "education": "HND/BSc", "age_min": 24,
#                 "gender": "any", "openings": 2,
#                 "work_mode": "hybrid", "employment_type": "full_time",
#                 "required_skills": ["Web Development", "HTML", "CSS", "JavaScript"],
#                 "description": "Web developer/builder. 2 years experience.",
#             },
#         ],
#     },
#     {
#         "name": "Santana Security",
#         "address": "13, Odejayi Crescent, Off Akinhanmi Street, Surulere, Lagos",
#         "contact_name": "Operations Manager",
#         "phone": "08172170540",
#         "city": "Surulere", "state": "Lagos",
#         "industry": "Security",
#         "jobs": [
#             {
#                 "title": "Security Guard",
#                 "salary_min": 40000, "salary_max": 70000,
#                 "education": "SSCE", "age_min": 24, "age_max": 45,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Security", "Surveillance"],
#                 "description": "Security guard.",
#             },
#             {
#                 "title": "Secretary",
#                 "salary_min": 50000, "salary_max": None,
#                 "education": "ND/HND/BSc", "age_min": 18, "age_max": 35,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Administration", "Computer Literacy"],
#                 "description": "Secretary.",
#             },
#             {
#                 "title": "Financial Controller",
#                 "salary_min": 250000, "salary_max": 300000,
#                 "education": "HND/BSc", "age_min": 24, "age_max": 40,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Finance", "Accounting", "Financial Control"],
#                 "description": "Financial controller. 7 years experience required.",
#                 "years_experience": 7,
#             },
#             {
#                 "title": "Operational Supervisor",
#                 "salary_min": 90000, "salary_max": 90000,
#                 "education": "Graduate",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Supervision", "Operations", "Security"],
#                 "description": "Operational supervisor.",
#             },
#             {
#                 "title": "Driver",
#                 "salary_min": 110000, "salary_max": 110000,
#                 "education": "Any",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Driving", "Valid License"],
#                 "description": "Driver with valid license.",
#             },
#         ],
#     },
#     {
#         "name": "Jollof by Jara",
#         "address": "33, Folaosibo, Lekki, Lagos",
#         "contact_name": "CEO",
#         "phone": "07034058140",
#         "city": "Lekki", "state": "Lagos",
#         "industry": "Restaurant / Hospitality",
#         "jobs": [
#             {
#                 "title": "General Manager",
#                 "salary_min": 250000, "salary_max": 250000,
#                 "education": "Graduate",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Management", "Restaurant Operations", "Leadership"],
#                 "description": "Experienced general manager for restaurant.",
#             },
#             {
#                 "title": "Floor Supervisor",
#                 "salary_min": 100000, "salary_max": 100000,
#                 "education": "Graduate",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Supervision", "Hospitality"],
#                 "description": "Floor supervisor. Experienced.",
#             },
#             {
#                 "title": "Mixologist",
#                 "salary_min": 120000, "salary_max": 120000,
#                 "education": "Any",
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Bartending", "Mixology"],
#                 "description": "Experienced mixologist.",
#             },
#             {
#                 "title": "Waiter / Waitress",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "Any",
#                 "gender": "any", "openings": 6,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Hospitality"],
#                 "description": "Experienced waiters and waitresses.",
#             },
#         ],
#     },
#     {
#         "name": "Elites Holding Limited",
#         "address": "3, Amusan Oloyede Street, Off Tokunbo Alli, Ikeja, Lagos",
#         "contact_name": "CEO",
#         "phone": "08169040106",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Business / Consulting",
#         "jobs": [
#             {
#                 "title": "Marketing / Brand Manager",
#                 "salary_min": 150000, "salary_max": 150000,
#                 "education": "Graduate", "age_min": 25, "age_max": 40,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Marketing", "Brand Management"],
#                 "description": "Experienced marketing and brand manager.",
#             },
#             {
#                 "title": "Business Development Manager",
#                 "salary_min": 150000, "salary_max": 150000,
#                 "education": "Graduate", "age_min": 25, "age_max": 40,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Business Development", "Sales", "Strategy"],
#                 "description": "Experienced business development manager.",
#             },
#             {
#                 "title": "HR Manager",
#                 "salary_min": 200000, "salary_max": 200000,
#                 "education": "Graduate", "age_min": 25, "age_max": 40,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Human Resources", "Recruitment", "HR Management"],
#                 "description": "Experienced HR manager.",
#             },
#             {
#                 "title": "Driver",
#                 "salary_min": 80000, "salary_max": 80000,
#                 "education": "Any", "age_min": 25, "age_max": 40,
#                 "gender": "male", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Driving", "Valid License"],
#                 "description": "Experienced driver with valid license.",
#             },
#         ],
#     },
#     {
#         "name": "Sarom Restaurant",
#         "address": "3, Oluwakemi Street, Alapere Roundabout, Ketu, Lagos",
#         "contact_name": "MD",
#         "phone": "08022697053",
#         "city": "Ketu", "state": "Lagos",
#         "industry": "Restaurant / Food",
#         "jobs": [
#             {
#                 "title": "Pastry Chef",
#                 "salary_min": 100000, "salary_max": 100000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Pastry", "Baking", "Food Preparation"],
#                 "description": "Experienced pastry chef.",
#             },
#             {
#                 "title": "Chef",
#                 "salary_min": 150000, "salary_max": 150000,
#                 "education": "Any",
#                 "gender": "any", "openings": 4,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Cooking", "Food Preparation", "Kitchen Management"],
#                 "description": "Experienced chef.",
#             },
#             {
#                 "title": "Grill Chef",
#                 "salary_min": 150000, "salary_max": 150000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Grilling", "Cooking"],
#                 "description": "Experienced grill chef.",
#             },
#             {
#                 "title": "Driver",
#                 "salary_min": 120000, "salary_max": 120000,
#                 "education": "Any",
#                 "gender": "male", "openings": 5,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Driving", "Valid License"],
#                 "description": "Drivers needed.",
#             },
#             {
#                 "title": "Dispatch Rider",
#                 "salary_min": 120000, "salary_max": 120000,
#                 "education": "Any",
#                 "gender": "male", "openings": 5,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Dispatch", "Motorcycle Riding"],
#                 "description": "Dispatch riders needed.",
#             },
#             {
#                 "title": "Cleaner",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "Any",
#                 "gender": "any", "openings": 3,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Cleaning"],
#                 "description": "Cleaners needed.",
#             },
#             {
#                 "title": "Customer Service Officer",
#                 "salary_min": 80000, "salary_max": 80000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Communication"],
#                 "description": "Customer service officer.",
#             },
#             {
#                 "title": "Store Keeper",
#                 "salary_min": 80000, "salary_max": 80000,
#                 "education": "Any",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Inventory", "Store Management"],
#                 "description": "Store keeper.",
#             },
#         ],
#     },
#     {
#         "name": "Woodmarble Hotel",
#         "address": "93, Shipeola Street, Palmgroove, Lagos",
#         "contact_name": "Manager",
#         "phone": "09036249943",
#         "city": "Palmgroove", "state": "Lagos",
#         "industry": "Hospitality",
#         "jobs": [
#             {
#                 "title": "Receptionist",
#                 "salary_min": 50000, "salary_max": 50000,
#                 "education": "ND/HND", "age_min": 22, "age_max": 30,
#                 "gender": "female", "openings": 4,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Communication", "Computer Literacy"],
#                 "description": "Hotel receptionist. 1-2 years experience.",
#             },
#             {
#                 "title": "Housekeeper",
#                 "salary_min": 30000, "salary_max": 30000,
#                 "education": "SSCE", "age_min": 19,
#                 "gender": "female", "openings": 2,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Housekeeping", "Cleaning"],
#                 "description": "Hotel housekeeper.",
#             },
#             {
#                 "title": "Accountant",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "ND/HND/BSc", "age_min": 22,
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Accounting", "Finance"],
#                 "description": "Hotel accountant.",
#             },
#         ],
#     },
#     {
#         "name": "Millie Hill by Jara",
#         "address": "Eleko, Ibeju Lekki, Lagos",
#         "contact_name": "CEO",
#         "phone": "07034058140",
#         "city": "Ibeju Lekki", "state": "Lagos",
#         "industry": "Hospitality / Hotel",
#         "jobs": [
#             {
#                 "title": "Guest Service / Front Desk Officer",
#                 "salary_min": 150000, "salary_max": 200000,
#                 "education": "Graduate",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Front Desk", "Communication"],
#                 "description": "Guest service and front desk officer. Female graduate.",
#             },
#             {
#                 "title": "Housekeeper",
#                 "salary_min": 150000, "salary_max": 150000,
#                 "education": "Graduate",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Housekeeping", "Hospitality"],
#                 "description": "Female housekeeper. Graduate.",
#             },
#         ],
#     },
#     {
#         "name": "Broad Kapital Business Solution",
#         "address": "146, Obafemi Awolowo Way, Off Lagos Airport Hotel, Ikeja, Lagos",
#         "contact_name": "Miss Gift",
#         "phone": "09028232934",
#         "city": "Ikeja", "state": "Lagos",
#         "industry": "Business / Marketing",
#         "jobs": [
#             {
#                 "title": "Marketer",
#                 "salary_min": 75000, "salary_max": 75000,
#                 "education": "Any", "age_min": 20,
#                 "gender": "any", "openings": 100,
#                 "work_mode": "field", "employment_type": "full_time",
#                 "required_skills": ["Marketing", "Sales", "Communication"],
#                 "description": "100 marketers needed.",
#             },
#         ],
#     },
#     {
#         "name": "Eritville Gift Company",
#         "address": "No 2, First Foundation Close, Besides Adebola House, Opebi, Lagos",
#         "contact_name": "CEO",
#         "phone": "09060008075",
#         "city": "Opebi", "state": "Lagos",
#         "industry": "Retail / Gifts",
#         "jobs": [
#             {
#                 "title": "Customer Service / Sales Representative",
#                 "salary_min": 120000, "salary_max": 120000,
#                 "education": "Graduate",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Sales"],
#                 "description": "Customer service and sales rep. Female graduate.",
#             },
#             {
#                 "title": "Social Media Manager",
#                 "salary_min": 150000, "salary_max": 150000,
#                 "education": "Graduate",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "hybrid", "employment_type": "full_time",
#                 "required_skills": ["Social Media", "Content Creation", "Digital Marketing"],
#                 "description": "Social media manager.",
#             },
#             {
#                 "title": "Admin Personnel",
#                 "salary_min": 100000, "salary_max": 120000,
#                 "education": "Any",
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Administration", "Computer Literacy"],
#                 "description": "Admin personnel. Female.",
#             },
#         ],
#     },
#     {
#         "name": "Heartbreach Law Firm",
#         "address": "14, Salvation Street, Opebi, Ikeja, Lagos",
#         "contact_name": "MD",
#         "phone": "08022888007",
#         "city": "Opebi", "state": "Lagos",
#         "industry": "Legal / Law",
#         "jobs": [
#             {
#                 "title": "Lawyer",
#                 "salary_min": 70000, "salary_max": None,
#                 "education": "Graduate",
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Law", "Legal Research", "Litigation"],
#                 "description": "Experienced lawyer.",
#             },
#             {
#                 "title": "Front Desk Officer",
#                 "salary_min": 50000, "salary_max": 100000,
#                 "education": "ND/HND/BSc", "age_min": 22,
#                 "gender": "female", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Computer Literacy"],
#                 "description": "Female front desk officer. Computer literate.",
#             },
#         ],
#     },
#     {
#         "name": "Allure Cosmetics",
#         "address": "Pentagon Plaza, 23 Opebi Road, Ikeja, Lagos",
#         "contact_name": "Manager",
#         "phone": "08036272801",
#         "city": "Opebi", "state": "Lagos",
#         "industry": "Beauty / Cosmetics",
#         "jobs": [
#             {
#                 "title": "Customer Care Officer",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "OND/HND/BSc", "age_min": 20,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Customer Service", "Communication"],
#                 "description": "Customer care officer.",
#             },
#             {
#                 "title": "Accountant",
#                 "salary_min": 100000, "salary_max": 100000,
#                 "education": "Graduate", "age_min": 22, "age_max": 30,
#                 "gender": "any", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Accounting", "Finance"],
#                 "description": "Experienced accountant.",
#             },
#             {
#                 "title": "Inventory / Logistics Officer",
#                 "salary_min": 70000, "salary_max": 70000,
#                 "education": "Graduate", "age_min": 20, "age_max": 35,
#                 "gender": "male", "openings": 1,
#                 "work_mode": "onsite", "employment_type": "full_time",
#                 "required_skills": ["Inventory Management", "Logistics"],
#                 "description": "Inventory and logistics officer.",
#             },
#         ],
#     },
# ]


# async def seed():
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)

#     async with AsyncSessionLocal() as db:

#         # Load role map
#         role_map = {}
#         result = await db.execute(select(Role))
#         for role in result.scalars().all():
#             role_map[role.slug] = role

#         if not role_map:
#             print("❌ No roles found. Run seed_admin.py first to seed roles.")
#             return

#         org_role = role_map.get("org")
#         if not org_role:
#             print("❌ 'org' role not found. Run seed_admin.py first.")
#             return

#         print(f"\n── Seeding {len(ORGS)} organisations ──────────────────────\n")
#         seeded_orgs = 0
#         seeded_jobs = 0

#         for i, org_data in enumerate(ORGS, start=1):
#             email = gen_email(org_data["name"], i)
#             password = gen_password(org_data["name"])

#             # Check if user exists
#             result = await db.execute(select(User).where(User.email == email))
#             existing_user = result.scalar_one_or_none()

#             if existing_user:
#                 print(f"  (exists) {org_data['name']}: {email}")
#                 # Still get org to seed jobs
#                 org_result = await db.execute(
#                     select(Organization).where(Organization.user_id == existing_user.id)
#                 )
#                 org = org_result.scalar_one_or_none()
#             else:
#                 # Create user
#                 user = User(
#                     email=email,
#                     password_hash=hash_password(password),
#                     role=LegacyUserRole.ORG,
#                     is_active=True,
#                     is_verified=True,
#                 )
#                 db.add(user)
#                 await db.flush()

#                 # Assign RBAC role
#                 db.add(RBACUserRole(
#                     user_id=user.id,
#                     role_id=org_role.id,
#                     is_primary=True,
#                 ))
#                 await db.flush()

#                 # Create organisation
#                 org = Organization(
#                     user_id=user.id,
#                     name=org_data["name"],
#                     description=f"{org_data['name']} — {org_data['industry']}",
#                     industry=org_data["industry"],
#                     city=org_data["city"],
#                     state=org_data["state"],
#                     free_posts_left=0,
#                     free_matches_left=0,
#                     is_verified=True,
#                 )
#                 db.add(org)
#                 await db.flush()
#                 seeded_orgs += 1
#                 print(f"  ✓ [{i:03}] {org_data['name']}")
#                 print(f"         Email:    {email}")
#                 print(f"         Password: {password}")

#             # Seed jobs for this org
#             if org:
#                 for job_data in org_data.get("jobs", []):
#                     # Skip if job title empty
#                     if not job_data.get("title"):
#                         continue

#                     # Check if job already exists for this org
#                     existing_job = await db.execute(
#                         select(Job).where(
#                             Job.org_id == org.id,
#                             Job.title == job_data["title"],
#                         )
#                     )
#                     if existing_job.scalar_one_or_none():
#                         continue

#                     salary_min = job_data.get("salary_min")
#                     salary_max = job_data.get("salary_max") or salary_min

#                     job = Job(
#                         org_id=org.id,
#                         title=job_data["title"],
#                         description=job_data.get("description", ""),
#                         city=org_data["city"],
#                         state=org_data["state"],
#                         work_mode=job_data.get("work_mode", "onsite"),
#                         employment_type=job_data.get("employment_type", "full_time"),
#                         salary_min=salary_min,
#                         salary_max=salary_max,
#                         required_skills=job_data.get("required_skills", []),
#                         # ✅ FIXED MAPPINGS
#                         required_education=job_data.get("education"),
#                         preferred_gender=job_data.get("gender"),
#                         preferred_age_min=job_data.get("age_min"),
#                         preferred_age_max=job_data.get("age_max"),
#                         required_experience_years=job_data.get("years_experience"),
                        
                       
#                     )
#                     db.add(job)
#                     seeded_jobs += 1

#         await db.commit()

#         print(f"\n════════════════════════════════════════════════════════")
#         print(f"  ✅ Seeded {seeded_orgs} organisations and {seeded_jobs} jobs!")
#         print(f"════════════════════════════════════════════════════════")
#         print(f"\n  Credentials summary (save this):")
#         print(f"  {'Organisation':<40} {'Email':<35} Password")
#         print(f"  {'─'*40} {'─'*35} {'─'*20}")
#         for i, org_data in enumerate(ORGS, start=1):
#             email = gen_email(org_data["name"], i)
#             password = gen_password(org_data["name"])
#             print(f"  {org_data['name']:<40} {email:<35} {password}")
#         print(f"════════════════════════════════════════════════════════\n")


# if __name__ == "__main__":
#     asyncio.run(seed())