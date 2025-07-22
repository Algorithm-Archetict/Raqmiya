import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreModule } from './core-module';
import { SharedModule } from './shared/shared-module';
import { AppRoutingModule } from './app-routing-module';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    CoreModule,
    SharedModule,
    AppRoutingModule
  ]
})
export class AppModule { }
