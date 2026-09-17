import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FavouritesService } from './core/favourites-service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly favourites = inject(FavouritesService);
}
