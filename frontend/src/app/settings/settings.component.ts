import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p>
      settings works!
    </p>
  `,
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {

}
