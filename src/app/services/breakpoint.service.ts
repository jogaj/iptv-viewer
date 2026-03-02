import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { inject, Injectable } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { filter, map, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class BreakpointService {

    private readonly breakpointObserver = inject(BreakpointObserver);
    private previousValue: boolean | null = null;

    isSmallViewport = toSignal(
        this.breakpointObserver.observe('(max-width: 959.98px)')
        .pipe(takeUntilDestroyed(), 
            map(result => result.matches))
        );
}