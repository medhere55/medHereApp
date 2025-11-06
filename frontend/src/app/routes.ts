import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { MedicationsComponent } from "./medications/medications.component";
import { CalendarComponent } from "./calendar/calendar.component";
import { SettingsComponent } from "./settings/settings.component";
import { LoginComponent } from "./login/login.component";

const routeConfig: Routes = [
    {
        path: 'login',
        component: LoginComponent,
        title: 'Login'
    },
    {
        path: '',
        component: HomeComponent,
        title: 'Home'
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard'
    },
    {
        path: 'medications',
        component: MedicationsComponent,
        title: 'Medications'
    },
    {
        path: 'calendar',
        component: CalendarComponent,
        title: 'Calendar'
    },
    {
        path: 'settings',
        component: SettingsComponent,
        title: 'Settings'
    }
];

export default routeConfig;