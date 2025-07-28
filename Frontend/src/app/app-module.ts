import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core-module';
import { SharedModule } from './shared/shared-module';
import { AppRoutingModule } from './app-routing-module';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

// Font Awesome
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    CoreModule,
    SharedModule,
    AppRoutingModule,
    
    // PrimeNG Modules
    ButtonModule,
    CardModule,
    InputTextModule,
    MenuModule,
    ToastModule,
    ProgressSpinnerModule,
    DialogModule,
    TableModule,
    ChartModule,
    PanelModule,
    DividerModule,
    AvatarModule,
    BadgeModule,
    TooltipModule,
    
    // Font Awesome
    FontAwesomeModule
  ]
})
export class AppModule { }
