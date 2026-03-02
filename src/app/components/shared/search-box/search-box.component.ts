import { Component, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [
     MatIconModule,
     MatInputModule,
     MatFormFieldModule,
     FormsModule
  ],
  styleUrls: ['./search-box.component.scss'],
  templateUrl: './search-box.component.html',
})
export class SearchBoxComponent {
    title = input<string>('');
    placeholder = input<string>('');
     valueChanged = output<string>()

    searchMode = signal<boolean>(false);

    toggleMode(event: Event): void {
        event.stopPropagation();
        this.searchMode.set(!this.searchMode());
        if (!this.searchMode()) this.valueChanged.emit('');
    }

    onKeyUp(event: Event): void {
        this.valueChanged.emit((event.target as HTMLInputElement).value);
    }

}
