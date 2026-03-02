import { FormControl, FormGroup } from "@angular/forms";

export type M3uForm = FormGroup<{
  name: FormControl<string>;
  playlistUrl: FormControl<string>;
}>;

export type XtreamForm = FormGroup<{
  name: FormControl<string>;
  baseUrl: FormControl<string>;
  username: FormControl<string>;
  password: FormControl<string>;
}>;